const chai = require('chai')
const chaiSubset = require('chai-subset')
const _ = require('lodash')
const fs = require('fs')
const {capture, captureFlat, waitFor, waitForWithError, waitForData} = require('../testutil/Helpers')
const TestItem = require('../testutil/TestItem')
const TestS3Store = require('../testutil/TestS3Store')
const {LocalUpdateStore, S3UpdateStore, StateController, PersistentStore, JsonUtil, AccessKeyCredentialsSource, Promoter} = require('../../main/index')

chai.should()
chai.use(chaiSubset)

class TestApp {
    constructor(items = {}) {
        this.items = items
    }

    setItem(item) {
        const newItems = Object.assign({}, this.items, {[item.id]: item})
        return new TestApp(newItems)
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

        persistentStore.externalUpdate.sendTo(app.applyUpdate)
        app.newUpdate.sendTo(persistentStore.dispatchUpdate)

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

    const credentialsSource = new AccessKeyCredentialsSource(testAccessKey, testSecretKey)
    const testS3 = new TestS3Store(testBucket, null, null, appName, dataSet)

    beforeEach(function () {
        return testS3.clearBucket()
    })

    it("app stores updates", function () {
        const [appA, persistentStoreA] = createAppWithStore("userA")

        const testS3 = new TestS3Store(testBucket, null, null, appName, dataSet)
        const testItem1 = new TestItem("id1", "One", 1)
        appA.update("setItem", testItem1)

        return waitForData( () => testS3.getKeys("user/userA"), keys => keys.length === 1 , 2000 )
    })

    it("apps receive updates from each other", function () {
        const [appA, persistentStoreA] = createAppWithStore("userA")
        const [appB, persistentStoreB] = createAppWithStore("userB")
        const promoter = createPromoter()
        const testItem1 = new TestItem("id1", "One", 1)

        setInterval( () => persistentStoreB.checkForUpdates(), 1000)

        appA.update("setItem", testItem1)

        waitForData( () => testS3.getKeys("user/userA"),  keys => keys.length === 1 , 2000 )
            .then( keys => promoter.promote(keys[0]) )

        return waitForWithError( () => appB.appState.item(testItem1.id).should.eql(testItem1) )
        // return waitForWithError( () => appB.appState.item(testItem1.id) )
    })
})

