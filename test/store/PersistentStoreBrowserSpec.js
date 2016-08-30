const chai = require('chai')
const chaiSubset = require('chai-subset')
const {PersistentStore, LocalUpdateStore, AccessKeyCredentialsSource, S3UpdateStore, JsonUtil} = require('../../main')
const {capture, waitFor} = require('../testutil/Helpers')
const TestS3Store = require('../testutil/TestS3Store')
const uuid = require('node-uuid')
const _ = require('lodash')
const fs = require('fs')


chai.should()
chai.use(chaiSubset)

class TestItem {
    constructor(name, index) {
        this.name = name
        this.index = index
    }

    toJSON() {
        return {"@type": this.constructor.name, name: this.name, index: this.index}
    }

}

JsonUtil.registerClass(TestItem)

function testAction(name, index) {
    return {type: 'TEST', data: new TestItem(name, index)}
}

function testUpdate(name, index = 0) {
    return {actions: [testAction(name, index)]}
}

function testUpdateWithId(name) {
    return Object.assign({id: uuid.v4()}, testUpdate(name))
}

describe("Persistent store in browser", function () {
    this.timeout(10000)

    const {testBucket, testAccessKey, testSecretKey} = JSON.parse(fs.readFileSync('./.testConfig.json'))
    console.log("testBucket", testBucket)
    console.log("testAccessKey", testAccessKey)

    const testUpdate1 = testUpdate("One hundred and One")
    const [savedUpdate1, savedUpdate2, savedUpdate3, savedUpdate4, savedUpdate5, savedUpdate6, savedUpdate7]
        = ["One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten"].map(testUpdateWithId)

    const appName = "testapp"
    const dataSet = "testdata"
    let store, localStore, localData, credentialsSource, remoteStore, testS3Store
    let externalUpdates

    function createPersistentStore() {
        localStore = new LocalUpdateStore(localData)
        store = new PersistentStore(localStore, remoteStore)
        externalUpdates = capture(store.externalUpdate)
    }

    function incomingUpdates(...updates) {
        return testS3Store.clearBucket().then(() => testS3Store.setupIncomingUpdates(...updates))
    }

    beforeEach("set up app", function () {
        localData = {unsavedUpdates: [], updates: []}
        credentialsSource = new AccessKeyCredentialsSource(testAccessKey, testSecretKey)
        remoteStore = new S3UpdateStore(testBucket, "outgoingUpdates", "incomingUpdates", appName, dataSet, credentialsSource)

        testS3Store = new TestS3Store(testBucket, "outgoingUpdates", "incomingUpdates", appName, dataSet)
    })

    describe("On startup", function () {

        it("online: loads local updates, loads new remote updates, loads local unsaved updates and stores them remotely", function () {
            return incomingUpdates(savedUpdate1, savedUpdate2, savedUpdate3, savedUpdate4, savedUpdate5).then(function () {
                localData.updates = [savedUpdate1, savedUpdate2]
                localData.unsavedUpdates = [savedUpdate6, savedUpdate7]
                createPersistentStore()

                store.init()

                return waitFor(() => {
                    return externalUpdates.length === 7
                }, 2000)
                    .then(function () {
                        return waitFor(() => localData.unsavedUpdates.length === 0, 2000)
                    })
                    .then(function () {
                        return waitFor(() => testS3Store.getOutgoingUpdates().then(updates => updates.length === 2), 2000)
                            .then(() => testS3Store.getOutgoingUpdates().then(updates => updates.should.eql([savedUpdate6, savedUpdate7])))
                    })
                    .then(function () {
                        const sortedUpdates = _.sortBy(externalUpdates, a => a.actions[0].data.index)
                        sortedUpdates.should.eql([savedUpdate1, savedUpdate2, savedUpdate3, savedUpdate4, savedUpdate5, savedUpdate6, savedUpdate7])
                        sortedUpdates.forEach( a => a.actions[0].data.should.be.instanceof(TestItem) )
                    })

            })
        })

        it("offline: loads local updates, loads local unsaved updates", function () {
            localData.updates = [savedUpdate1, savedUpdate2]
            localData.unsavedUpdates = [savedUpdate6, savedUpdate7]
            createPersistentStore()
            credentialsSource.signOut()

            store.init()

            return waitFor(() => {
                return externalUpdates.length === 4
            }, 2000)
                .then(function () {
                    const sortedUpdates = _.sortBy(externalUpdates, a => a.actions[0].data.index)
                    sortedUpdates.should.eql([savedUpdate1, savedUpdate2, savedUpdate6, savedUpdate7])
                })
        })
    })

    describe("On new update from view", function () {
        it("online: loads new remote updates, stores dispatched update remotely, sends update to state", function () {
            return incomingUpdates(/*none*/).then(function () {
                createPersistentStore()
                store.init()

                return incomingUpdates(savedUpdate1, savedUpdate2)
                    .then(() => {
                        store.dispatchUpdate(testUpdate1)
                        return waitFor(() =>  {
                            return externalUpdates.length === 3
                        }, 2000)
                    })
                    .then(() => waitFor(() => localData.unsavedUpdates.length === 0, 2000))
                    .then(() => waitFor(() => testS3Store.getOutgoingUpdates().then(updates => updates.length === 1), 2000))
                    .then(() => testS3Store.getOutgoingUpdates().then(updates => updates[0].should.containSubset(testUpdate1)))
                    .then(() => externalUpdates.should.containSubset([savedUpdate1, savedUpdate2, testUpdate1]))
            })
        })

        it("offline: stores dispatched update locally and sends to state", function () {
            createPersistentStore()
            credentialsSource.signOut()
            store.init()
            store.dispatchUpdate(testUpdate1)
            localData.unsavedUpdates.should.containSubset([testUpdate1])

            return waitFor(() => externalUpdates.length === 1, 2000)
        })

    })

    describe("On check for updates", function () {
        it("online: loads new remote updates", function () {
            return incomingUpdates(/*none*/).then(function () {
                createPersistentStore()
                store.init()

                return incomingUpdates(savedUpdate1, savedUpdate2)
                    .then(() => {
                        store.checkForUpdates()
                        return waitFor(() => externalUpdates.length === 2, 2000)
                    })
                    .then(() => externalUpdates.should.containSubset([savedUpdate1, savedUpdate2]))
            })
        })

        it("offline: does nothing", function () {
            createPersistentStore()
            credentialsSource.signOut()
            store.init()
            store.checkForUpdates()
            externalUpdates.should.have.lengthOf(0)
        })

    })

    describe("When Store becomes available", function () {
        it("loads new remote updates, stores dispatched update remotely, does not send update to state again", function () {
            return incomingUpdates(/*none*/).then(function () {
                createPersistentStore()
                credentialsSource.signOut()
                store.init()

                return incomingUpdates(savedUpdate1, savedUpdate2)
                    .then(() => {
                        store.dispatchUpdate(testUpdate1)
                        return waitFor(() => externalUpdates.length === 1, 2000)
                    })
                    .then(() => credentialsSource.signIn(testAccessKey, testSecretKey))
                    .then(() => waitFor(() => localData.unsavedUpdates.length === 0, 2000))
                    .then(() => waitFor(() => testS3Store.getOutgoingUpdates().then(updates => updates.length === 1), 2000))
                    .then(() => testS3Store.getOutgoingUpdates().then(updates => updates[0].should.containSubset(testUpdate1)))
                    .then(() => externalUpdates.should.have.lengthOf(3).and.containSubset([testUpdate1, savedUpdate1, savedUpdate2]))
            })
        })
    })

    describe("In server configuration", function () {
        describe("On startup", function () {

            it("loads new remote updates", function () {
                return incomingUpdates(savedUpdate1, savedUpdate2, savedUpdate3, savedUpdate4, savedUpdate5 ).then(function () {
                    createPersistentStore()

                    store.init()

                    return waitFor(() => {
                        return externalUpdates.length === 5
                    }, 2000)
                        .then(function () {
                            const sortedUpdates = _.sortBy(externalUpdates, a => a.actions[0].data.index)
                            sortedUpdates.should.eql([savedUpdate1, savedUpdate2, savedUpdate3, savedUpdate4, savedUpdate5])
                            sortedUpdates.forEach( a => a.actions[0].data.should.be.instanceof(TestItem) )
                        })

                })
            })

        })

        describe("On new update from application", function () {
            it("loads new remote updates, stores dispatched action in an update, sends action to state", function () {
                return incomingUpdates(/*none*/).then(function () {
                    createPersistentStore()
                    store.init()

                    return incomingUpdates(savedUpdate1, savedUpdate2)
                        .then(() => {
                            store.dispatchUpdate(testUpdate1)
                            return waitFor(() => externalUpdates.length === 3, 2000)
                        })
                        .then(() => waitFor(() => testS3Store.getOutgoingUpdates().then(updates => updates.length === 1), 2000))
                        .then(() => testS3Store.getOutgoingUpdates().then(updates => updates[0].should.containSubset(testUpdate1)))
                        .then(() => externalUpdates.should.containSubset([savedUpdate1, savedUpdate2, testUpdate1]))
                })
            })

        })

    })

})

