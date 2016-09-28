const chai = require('chai')
const chaiSubset = require('chai-subset')
const _ = require('lodash')
const fs = require('fs')
const {capture, captureFlat, waitFor, waitForWithError, waitForData} = require('../testutil/Helpers')
const TestItem = require('../testutil/TestItem')
const TestS3Store = require('../testutil/TestS3Store')
const {LocalUpdateStore, S3UpdateStore, StateController, PersistentStore, JsonUtil, AccessKeyCredentialsSource, Promoter} = require('../../main/index')
const [userAreaPrefix, sharedAreaPrefix] = ["updates/user", "updates/shared"]

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

    const {appName, testAccessKey, testSecretKey} = JSON.parse(fs.readFileSync('./.testConfig.json'))
    const environment = "test"
    const promoterLambdaFunctionName = `${appName}_${environment}_promoter`
    const testBucket = `${appName}-${environment}-data`

    console.log("testBucket", testBucket)
    console.log("testAccessKey", testAccessKey)

    const dataSet = "testdata"

    function createAppWithStore(userId) {
        const model = new TestApp()
        const appConfig = {appName, dataSet}

        const app = new StateController(model)

        const localStore = new LocalUpdateStore()
        const credentialsSource = new AccessKeyCredentialsSource(testAccessKey, testSecretKey)
        const remoteStore = new S3UpdateStore({bucketName: testBucket, writeArea: `${userAreaPrefix}/$USER_ID$`, readArea: sharedAreaPrefix, appId: appConfig.appName, dataSet: appConfig.dataSet, credentialsSource})
        remoteStore.userId = userId

        const persistentStore = new PersistentStore(localStore, remoteStore)

        persistentStore.externalUpdate.sendTo(app.applyUpdate)
        app.newUpdate.sendTo(persistentStore.dispatchUpdate)

        persistentStore.init()

        return [app, persistentStore]
    }

    function lambdaEvent(key) {
        return {
            "Records":[
            {
                "eventVersion":"2.0",
                "eventSource":"aws:s3",
                "awsRegion":"eu-west-1",
                "eventTime":"1970-01-01T00:00:00.000Z",
                "eventName":"ObjectCreated:Put",
                "userIdentity":{
                    "principalId":"AIDAJDPLRKLG7UEXAMPLE"
                },
                "requestParameters":{
                    "sourceIPAddress":"127.0.0.1"
                },
                "responseElements":{
                    "x-amz-request-id":"C3D13FE58DE4C810",
                    "x-amz-id-2":"FMyUVURIY8/IgAtTv8xRjskZQpcIZ9KG4V5Wp6S7S/JRWeUWerMUE5JgHvANOjpD"
                },
                "s3":{
                    "s3SchemaVersion":"1.0",
                    "configurationId":"testConfigRule",
                    "bucket":{
                        "name": testBucket,
                        "ownerIdentity":{
                            "principalId":"A3NL1KOZZKExample"
                        },
                        "arn":`arn:aws:s3:::${testBucket}`
                    },
                    "object":{
                        "key":encodeURIComponent(key),
                        "size":1024,
                        "eTag":"d41d8cd98f00b204e9800998ecf8427e",
                        "versionId":"096fKKXTRTtl3on89fVO.nfljtsv6qko"
                    }
                }
            }
        ]
        }

    }

    function logError(e) {
        console.error(e)
    }

    new AccessKeyCredentialsSource(testAccessKey, testSecretKey) // so AWS configured for test store
    const testS3 = new TestS3Store(testBucket, null, null, appName, dataSet)

    beforeEach(function () {
        return testS3.clearBucket()
    })

    it("app stores updates in user area", function () {
        const [appA, persistentStoreA] = createAppWithStore("userA")

        const testS3 = new TestS3Store(testBucket, null, null, appName, dataSet)
        const testItem1 = new TestItem("id1", "One", 1)
        appA.update("setItem", testItem1)

        return waitForData( () => testS3.getKeys(`${userAreaPrefix}/userA`), keys => keys.length === 1 , 2000 )
    })

    it("a second app receives updates from a first", function () {
        const [appA, persistentStoreA] = createAppWithStore("userA")
        const [appB, persistentStoreB] = createAppWithStore("userB")
        const testItem1 = new TestItem("id1", "One", 1)
        const lambdaHandler = Promoter.createLambdaHandler("data", sharedAreaPrefix, new TestApp(), appName, dataSet)
        const callLambdaHandler = (key) => lambdaHandler(lambdaEvent(key), {functionName: promoterLambdaFunctionName}, (c) => {})

        setInterval( () => persistentStoreB.checkForUpdates(), 1000)

        appA.update("setItem", testItem1)

        waitForData( () => testS3.getKeys(`${userAreaPrefix}/userA`), keys => keys.length === 1 , 2000 )
            .then( keys => callLambdaHandler(keys[0]) ).catch(logError)

        return waitForWithError( () => appB.appState.item(testItem1.id) )
    })

    it("apps receive updates from each other", function () {
        const [appA, persistentStoreA] = createAppWithStore("userA")
        const [appB, persistentStoreB] = createAppWithStore("userB")
        const testItem1 = new TestItem("id1", "One", 1)
        const testItem2 = new TestItem("id2", "Two", 2)
        const lambdaHandler = Promoter.createLambdaHandler("data", sharedAreaPrefix, new TestApp(), appName, dataSet)
        const callLambdaHandler = (key) => lambdaHandler(lambdaEvent(key), {functionName: promoterLambdaFunctionName}, (c) => {})

        setInterval( () => persistentStoreA.checkForUpdates(), 1000)
        setInterval( () => persistentStoreB.checkForUpdates(), 1000)

        appA.update("setItem", testItem1)
        appB.update("setItem", testItem2)

        waitForData( () => testS3.getKeys(userAreaPrefix), keys => keys.length === 2 , 2000 )
            .then( keys => keys.forEach( callLambdaHandler ) ).catch(logError)

        return waitForWithError( () => appA.appState.item(testItem2.id) && appB.appState.item(testItem1.id) )
    })
})

