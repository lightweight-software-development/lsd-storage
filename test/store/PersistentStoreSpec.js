const chai = require('chai')
const chaiSubset = require('chai-subset')
const PersistentStore = require('../../main/store/PersistentStore')
const LocalStorageUpdateStore = require('../../main/store/LocalStorageUpdateStore')
const CognitoCredentialsSource = require('../../main/store/CognitoCredentialsSource')
const S3UpdateStore = require('../../main/store/S3UpdateStore')

chai.should()
chai.use(chaiSubset)

function testAction(name) {
    return {type: 'TEST', data: {name}}
}

function testActionWithId(name, id = uuid.v4()) {
    return {id, type: 'TEST', data: {name}}
}



describe("Persistent store", function () {
    this.timeout(100)

    const [testAction1, testAction2, testAction3] = ["One", "Two", "Three"].map(testAction)
    const appName = "testapp"
    const dataSet = "testdata"
    let store, localStore, mockStorage

    beforeEach("set up app", function () {
        mockStorage = new MockLocalStorage()
        localStore = new LocalStorageUpdateStore(appName, dataSet, mockStorage)

        const credentialsSource = new CognitoCredentialsSource()
        const remoteStore = new S3UpdateStore("abucket", 'updates', appName, dataSet, credentialsSource)

        store = new PersistentStore(localStore, remoteStore)
    })


    it("stores dispatched action locally if remote store not available", function () {
        store.dispatchAction(testAction1)
        JSON.parse(mockStorage.getItem("testapp.testdata.actions")).should.containSubset([testAction1])
    })
})

class MockLocalStorage {
    constructor() {
        this.items = new Map()
    }

    getItem(key) { return this.items.get(key)}
    setItem(key, value) { this.items.set(key, value)}
}