const chai = require('chai')
const chaiSubset = require('chai-subset')
const JsonUtil = require('../../main/json/JsonUtil')
const PersistentStore = require('../../main/store/PersistentStore')
const PersistentStoreController = require('../../main/store/PersistentStoreController')
const LocalStorageUpdateStore = require('../../main/store/LocalStorageUpdateStore')
const AccessKeyCredentialsSource = require('../../main/store/AccessKeyCredentialsSource')
const S3UpdateStore = require('../../main/store/S3UpdateStore')
const {capture, captureFlat, waitFor, waitForPromise} = require('../testutil/Helpers')
const {requireAWS} = require('../../main/util/Util')
const AWS = requireAWS()
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

describe("Persistent store", function () {
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
    const actionsKey = `${appName}.${dataSet}.actions`
    const updatesKey = `${appName}.${dataSet}.updates`
    let store, localStore, mockStorage, credentialsSource, remoteStore, testS3Store

    function createPersistentStore() {
        localStore = new LocalStorageUpdateStore(appName, dataSet, mockStorage)
        store = new PersistentStore(localStore, remoteStore)
    }

    function storedUpdates(...updates) {
        return testS3Store.clearUpdates().then(() => testS3Store.storeUpdates(...updates))
    }

    beforeEach("set up app", function () {
        mockStorage = new MockLocalStorage()

        credentialsSource = new AccessKeyCredentialsSource(testAccessKey, testSecretKey)
        remoteStore = new S3UpdateStore(testBucket, 'updates', appName, dataSet, credentialsSource)

        testS3Store = new TestS3Store(testBucket, "updates", appName, dataSet)
    })

    describe("On startup", function () {

        it("online: loads local updates, loads new remote updates, loads local actions, stores local actions in an update", function () {
            return storedUpdates(updateA, updateB, updateC).then(function () {
                mockStorage.setData(updatesKey, [updateA])
                mockStorage.setData(actionsKey, [savedAction6, savedAction7])
                createPersistentStore()

                const externalActions = capture(store.externalAction)
                store.init()

                return waitFor(() => {
                    // console.log( externalActions )
                    return externalActions.length === 7
                }, 2000)
                    .then(function () {
                        return waitFor(() => mockStorage.getData(actionsKey).length === 0, 2000)
                    })
                    .then(function () {
                        return waitFor(() => testS3Store.getUpdates().then(updates => updates.length === 4), 2000)
                            .then(() => testS3Store.getUpdates().then(updates => updates[3].actions.should.eql([savedAction6, savedAction7])))
                    })
                    .then(function () {
                        const sortedActions = _.sortBy(externalActions, a => a.data.index)
                        sortedActions.should.eql([savedAction1, savedAction2, savedAction3, savedAction4, savedAction5, savedAction6, savedAction7])
                        sortedActions.forEach( a => a.data.should.be.instanceof(TestItem) )
                    })

            })
        })

        it("offline: loads local updates, loads local actions", function () {
            mockStorage.setData(updatesKey, [updateA])
            mockStorage.setData(actionsKey, [savedAction6, savedAction7])
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
            return storedUpdates(/*none*/).then(function () {
                createPersistentStore()
                store.init()
                const externalActions = capture(store.externalAction)

                return storedUpdates(updateA)
                    .then(() => {
                        store.dispatchAction(testAction1)
                        return waitFor(() => externalActions.length === 3, 2000)
                    })
                    .then(() => waitFor(() => mockStorage.getData(actionsKey).length === 0, 2000))
                    .then(() => waitFor(() => testS3Store.getUpdates().then(updates => updates.length === 2), 2000))
                    .then(() => testS3Store.getUpdates().then(updates => updates[1].actions.should.containSubset([testAction1])))
                    .then(() => externalActions.should.containSubset([savedAction1, savedAction2, testAction1]))
            })
        })

        it("offline: stores dispatched action locally and sends to state", function () {
            createPersistentStore()
            credentialsSource.signOut()
            store.init()
            const externalActions = capture(store.externalAction)
            store.dispatchAction(testAction1)
            mockStorage.getData(actionsKey).should.containSubset([testAction1])

            return waitFor(() => externalActions.length === 1, 2000)
        })

    })

    describe("On check for updates", function () {
        it("online: loads new remote updates", function () {
            return storedUpdates(/*none*/).then(function () {
                createPersistentStore()
                store.init()
                const externalActions = capture(store.externalAction)

                return storedUpdates(updateA)
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
            return storedUpdates(/*none*/).then(function () {
                createPersistentStore()
                credentialsSource.signOut()
                store.init()
                const externalActions = capture(store.externalAction)

                return storedUpdates(updateA)
                    .then(() => {
                        store.dispatchAction(testAction1)
                        return waitFor(() => externalActions.length === 1, 2000)
                    })
                    .then(() => credentialsSource.signIn(testAccessKey, testSecretKey))
                    .then(() => waitFor(() => mockStorage.getData(actionsKey).length === 0, 2000))
                    .then(() => waitFor(() => testS3Store.getUpdates().then(updates => updates.length === 2), 2000))
                    .then(() => testS3Store.getUpdates().then(updates => updates[1].actions.should.containSubset([testAction1])))
                    .then(() => externalActions.should.have.lengthOf(3).and.containSubset([testAction1, savedAction1, savedAction2]))
            })
        })
    })

})

class MockLocalStorage {
    constructor() {
        this.items = new Map()
    }

    getItem(key) {
        return this.items.get(key)
    }

    setItem(key, value) {
        this.items.set(key, value)
    }

    getData(key) {
        return JsonUtil.fromStore(this.getItem(key))
    }

    setData(key, value) {
        this.setItem(key, JsonUtil.toStore(value))
    }
}

class TestS3Store {
    constructor(bucketName, keyPrefix, appId, dataSet) {
        Object.assign(this, {bucketName, keyPrefix, appId, dataSet})
        this.s3 = new AWS.S3()
    }

    getUpdates() {
        const {s3, bucketName} = this

        function getUpdateKeys() {
            return s3.listObjectsV2({Bucket: bucketName}).promise().then(listData => listData.Contents.map(x => x.Key).filter( k => !k.endsWith("/")))
        }

        function getObjectBody(key) {
            return s3.getObject({Bucket: bucketName, Key: key}).promise().then(data => data.Body)
        }

        function getObjectsForKeys(keys) {
            const promises = keys.map(getObjectBody)
            return Promise.all(promises)
        }

        function asUpdates(objectBodies) {
            return objectBodies.map(b => JsonUtil.fromStore(b))
        }

        return getUpdateKeys().then(getObjectsForKeys).then(asUpdates).catch(e => {
            console.error('TestS3Store: Error getting updates', e);
            return []
        })
    }

    clearUpdates() {
        const {s3, bucketName} = this

        function getUpdateKeys() {
            return s3.listObjectsV2({Bucket: bucketName}).promise().then(listData => listData.Contents.map(x => x.Key))
        }

        function deleteObjectsForKeys(keys) {
            if (!keys.length) {
                // console.log("TestS3Store: Bucket empty nothing to delete")
                return
            }
            const keysToDelete = keys.map(k => ({Key: k}))

            const params = {
                Bucket: bucketName,
                Delete: {
                    Objects: keysToDelete,
                }
            };
            return s3.deleteObjects(params).promise()
        }

        return getUpdateKeys().then(deleteObjectsForKeys).catch(e => {
            console.error('TestS3Store: Error clearing updates', e);
            return []
        })
    }

    storeUpdate(update) {
        const key = this._folderKey() + update.id
        return this._storeInS3(key, JsonUtil.toStore(update))
            .catch(e => console.error('Failed after sending update', e))
    }

    storeUpdates(...updates) {
        const folderPromise = this._storeInS3(this._folderKey(), '')
        const promises = updates.map(u => this.storeUpdate(u)).concat(folderPromise)
        return Promise.all(promises)
    }

    _folderKey() {
        const prefix = this.keyPrefix ? this.keyPrefix + '/' : ''
        return prefix + this.appId + '/' + this.dataSet + '/'
    }

    _storeInS3(key, objectContent) {
        const params = {
            Bucket: this.bucketName,
            Key: key,
            Body: objectContent
        }

        return this.s3.putObject(params).promise()
    }


}