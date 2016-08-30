const chai = require('chai')
const chaiSubset = require('chai-subset')
const _ = require('lodash')
const fs = require('fs')
const {capture, captureFlat, waitFor, waitForError} = require('../testutil/Helpers')
const TestS3Store = require('../testutil/TestS3Store')
const {LocalUpdateStore, S3UpdateStore, StateController, PersistentStore, JsonUtil, AccessKeyCredentialsSource, Promoter} = require('../../main')

chai.should()
chai.use(chaiSubset)

class TestItem {
    constructor(id, name, index) {
        this.id = id
        this.name = name
        this.index = index
    }

    toJSON() {
        return {"@type": this.constructor.name, name: this.name, index: this.index}
    }

}

JsonUtil.registerClass(TestItem)

class TestApp {
    constructor() {
        this.items = {}
    }

    setItem(item) {
        this.items = Object.merge({}, this.items, {[item.id]: item})
    }

    item(id) {
        return this.items[id]
    }
}

describe("App instances communicate via shared area", function () {
    this.timeout(10000)

    const {testBucket, testAccessKey, testSecretKey} = JSON.parse(fs.readFileSync('./.testConfig.json'))
    console.log("testBucket", testBucket)
    console.log("testAccessKey", testAccessKey)

    const appName = "testapp"
    const dataSet = "testdata"

    function createAppWithStore(userId) {
        const model = new TestApp()
        const appConfig = {appName, dataSet}

        const app = new StateController(model)

        const localStore = new LocalUpdateStore()
        const credentialsSource = new AccessKeyCredentialsSource(testAccessKey, testSecretKey)
        const remoteStore = new S3UpdateStore(testBucket, `user/${userId}`, 'shared', appConfig.appName, appConfig.dataSet, credentialsSource)

        const persistentStore = new PersistentStore(localStore, remoteStore)

        persistentStore.externalUpdate.sendTo(app.applyAction)
        app.newAction.sendTo(persistentStore.dispatchUpdate)

        persistentStore.init()

        return [app, persistentStore]
    }

    function createPromoter() {
        const model = new TestApp()
        const appConfig = {appName, dataSet}
        const credentialsSource = new AccessKeyCredentialsSource(testAccessKey, testSecretKey)
        const promoter = new Promoter(testBucket, model, appConfig, credentialsSource)
        return promoter
    }


    it.skip("apps receive updates from each other", function () {
        const [appA, persistentStoreA] = createAppWithStore("userA")
        const [appB, persistentStoreB] = createAppWithStore("userB")
        const promoter = createPromoter()
        const testS3 = new TestS3Store(testBucket, null, null, appName, dataSet)
        setInterval( () => persistentStoreB.checkForUpdates(), 1000)

        const testItem1 = new TestItem("id1", "One", 1)
        appA.update("setItem", testItem1)

        waitFor( () => testS3.getKeys("userA").then( keys => keys.length === 1 ))
            .then( () => testS3.getKeys("userA").then( keys => promoter.promote(keys[0] ) ))

        waitForError( () => appB.appState.item(testItem1.id).should.eql(testItem1) )
    })
})

