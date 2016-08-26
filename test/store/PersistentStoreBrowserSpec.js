const chai = require('chai')
const chaiSubset = require('chai-subset')
const JsonUtil = require('../../main/json/JsonUtil')
const PersistentStore = require('../../main/store/PersistentStore')
const PersistentStoreController = require('../../main/store/PersistentStoreController')
const UpdateStore = require('../../main/store/UpdateStore')
const AccessKeyCredentialsSource = require('../../main/store/AccessKeyCredentialsSource')
const S3UpdateStore = require('../../main/store/S3UpdateStore')
const {capture, captureFlat, waitFor, waitForPromise} = require('../testutil/Helpers')
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

function testAction(name, index = 0) {
    return {type: 'TEST', data: new TestItem(name, index)}
}

function testActionWithId(name, index) {
    id = uuid.v4()
    return {id, type: 'TEST', data: new TestItem(name, index)}
}

function update(actions) {
    return PersistentStoreController.newUpdate(actions)
}

describe("Persistent store in browser", function () {
    this.timeout(10000)

    const {testBucket, testAccessKey, testSecretKey} = JSON.parse(fs.readFileSync('./.testConfig.json'))
    console.log("testBucket", testBucket)
    console.log("testAccessKey", testAccessKey)

    const [testAction1, testAction2, testAction3] = ["One", "Two", "Three"].map(testAction)
    const [savedAction1, savedAction2, savedAction3, savedAction4, savedAction5, savedAction6, savedAction7, savedAction8, savedAction9, savedAction10]
        = ["One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten"].map(testActionWithId)

    const updateA = update([savedAction1, savedAction2])
    const updateB = update([savedAction3])
    const updateC = update([savedAction4, savedAction5])

    const appName = "testapp"
    const dataSet = "testdata"
    let store, localStore, localData, credentialsSource, remoteStore, testS3Store

    function createPersistentStore() {
        localStore = new UpdateStore(localData)
        store = new PersistentStore(localStore, remoteStore)
    }

    function incomingUpdates(...updates) {
        return testS3Store.clearBucket().then(() => testS3Store.setupIncomingUpdates(...updates))
    }

    beforeEach("set up app", function () {
        localData = {actions: [], updates: []}
        credentialsSource = new AccessKeyCredentialsSource(testAccessKey, testSecretKey)
        remoteStore = new S3UpdateStore(testBucket, "outgoingUpdates", "incomingUpdates", appName, dataSet, credentialsSource)

        testS3Store = new TestS3Store(testBucket, "outgoingUpdates", "incomingUpdates", appName, dataSet)
    })

    describe("On startup", function () {

        it("online: loads local updates, loads new remote updates, loads local actions, stores local actions in an update", function () {
            return incomingUpdates(updateA, updateB, updateC).then(function () {
                localData.updates = [updateA]
                localData.actions = [savedAction6, savedAction7]
                createPersistentStore()

                const externalActions = capture(store.externalAction)
                store.init()

                return waitFor(() => {
                    // console.log( externalActions )
                    return externalActions.length === 7
                }, 2000)
                    .then(function () {
                        return waitFor(() => localData.actions.length === 0, 2000)
                    })
                    .then(function () {
                        return waitFor(() => testS3Store.getOutgoingUpdates().then(updates => updates.length === 1), 2000)
                            .then(() => testS3Store.getOutgoingUpdates().then(updates => updates[0].actions.should.eql([savedAction6, savedAction7])))
                    })
                    .then(function () {
                        const sortedActions = _.sortBy(externalActions, a => a.data.index)
                        sortedActions.should.eql([savedAction1, savedAction2, savedAction3, savedAction4, savedAction5, savedAction6, savedAction7])
                        sortedActions.forEach( a => a.data.should.be.instanceof(TestItem) )
                    })

            })
        })

        it("offline: loads local updates, loads local actions", function () {
            localData.updates = [updateA]
            localData.actions = [savedAction6, savedAction7]
            createPersistentStore()
            credentialsSource.signOut()

            const externalActions = capture(store.externalAction)
            store.init()

            return waitFor(() => {
                // console.log( externalActions )
                return externalActions.length === 4
            }, 2000)
                .then(function () {
                    const sortedActions = _.sortBy(externalActions, a => a.data.index)
                    sortedActions.should.eql([savedAction1, savedAction2, savedAction6, savedAction7])
                })
        })
    })

    describe("On new action from view", function () {
        it("online: loads new remote updates, stores dispatched action in an update, sends action to state", function () {
            return incomingUpdates(/*none*/).then(function () {
                createPersistentStore()
                store.init()
                const externalActions = capture(store.externalAction)

                return incomingUpdates(updateA)
                    .then(() => {
                        store.dispatchAction(testAction1)
                        return waitFor(() => externalActions.length === 3, 2000)
                    })
                    .then(() => waitFor(() => localData.actions.length === 0, 2000))
                    .then(() => waitFor(() => testS3Store.getOutgoingUpdates().then(updates => updates.length === 1), 2000))
                    .then(() => testS3Store.getOutgoingUpdates().then(updates => updates[0].actions.should.containSubset([testAction1])))
                    .then(() => externalActions.should.containSubset([savedAction1, savedAction2, testAction1]))
            })
        })

        it("offline: stores dispatched action locally and sends to state", function () {
            createPersistentStore()
            credentialsSource.signOut()
            store.init()
            const externalActions = capture(store.externalAction)
            store.dispatchAction(testAction1)
            localData.actions.should.containSubset([testAction1])

            return waitFor(() => externalActions.length === 1, 2000)
        })

    })

    describe("On check for updates", function () {
        it("online: loads new remote updates", function () {
            return incomingUpdates(/*none*/).then(function () {
                createPersistentStore()
                store.init()
                const externalActions = capture(store.externalAction)

                return incomingUpdates(updateA)
                    .then(() => {
                        store.checkForUpdates()
                        return waitFor(() => externalActions.length === 2, 2000)
                    })
                    .then(() => externalActions.should.containSubset([savedAction1, savedAction2]))
            })
        })

        it("offline: does nothing", function () {
            createPersistentStore()
            credentialsSource.signOut()
            store.init()
            const externalActions = capture(store.externalAction)
            store.checkForUpdates()
            externalActions.should.have.lengthOf(0)
        })

    })

    describe("When Store becomes available", function () {
        it("loads new remote updates, stores dispatched action in an update, does not send action to state again", function () {
            return incomingUpdates(/*none*/).then(function () {
                createPersistentStore()
                credentialsSource.signOut()
                store.init()
                const externalActions = capture(store.externalAction)

                return incomingUpdates(updateA)
                    .then(() => {
                        store.dispatchAction(testAction1)
                        return waitFor(() => externalActions.length === 1, 2000)
                    })
                    .then(() => credentialsSource.signIn(testAccessKey, testSecretKey))
                    .then(() => waitFor(() => localData.actions.length === 0, 2000))
                    .then(() => waitFor(() => testS3Store.getOutgoingUpdates().then(updates => updates.length === 1), 2000))
                    .then(() => testS3Store.getOutgoingUpdates().then(updates => updates[0].actions.should.containSubset([testAction1])))
                    .then(() => externalActions.should.have.lengthOf(3).and.containSubset([testAction1, savedAction1, savedAction2]))
            })
        })
    })

    describe("In server configuration", function () {
        describe("On startup", function () {

            it("loads new remote updates", function () {
                return incomingUpdates(updateA, updateB, updateC).then(function () {
                    createPersistentStore()

                    const externalActions = capture(store.externalAction)
                    store.init()

                    return waitFor(() => {
                        // console.log( externalActions )
                        return externalActions.length === 5
                    }, 2000)
                        .then(function () {
                            const sortedActions = _.sortBy(externalActions, a => a.data.index)
                            sortedActions.should.eql([savedAction1, savedAction2, savedAction3, savedAction4, savedAction5])
                            sortedActions.forEach( a => a.data.should.be.instanceof(TestItem) )
                        })

                })
            })

        })

        describe("On new action from view", function () {
            it("loads new remote updates, stores dispatched action in an update, sends action to state", function () {
                return incomingUpdates(/*none*/).then(function () {
                    createPersistentStore()
                    store.init()
                    const externalActions = capture(store.externalAction)

                    return incomingUpdates(updateA)
                        .then(() => {
                            store.dispatchAction(testAction1)
                            return waitFor(() => externalActions.length === 3, 2000)
                        })
                        .then(() => waitFor(() => testS3Store.getOutgoingUpdates().then(updates => updates.length === 1), 2000))
                        .then(() => testS3Store.getOutgoingUpdates().then(updates => updates[0].actions.should.containSubset([testAction1])))
                        .then(() => externalActions.should.containSubset([savedAction1, savedAction2, testAction1]))
                })
            })

        })

    })

})

