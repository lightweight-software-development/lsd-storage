const chai = require('chai')
const PersistentStore = require('../../main/js/store/PersistentStore')

chai.should()

function testAction(name) {
    return {type: 'TEST', data: {name}}
}

function testActionWithId(name, id = uuid.v4()) {
    return {id, type: 'TEST', data: {name}}
}



describe("Persistent store", function () {
    this.timeout(100)

    const [testAction1, testAction2, testAction3] = ["One", "Two", "Three"].map(testAction)
    const config = {
        appName: "testapp"
    }
    let store, storage

    beforeEach("set up app", function () {
        storage = new MockLocalStorage()
        store = new PersistentStore(localStore, remoteStore)
    })


    it("stores dispatched action locally if remote store not available", function () {
        store.dispatchAction(testAction1)
        storage.getItem("testapp.actions").should.eql(JSON.stringify([testAction1]))
    })
})

class MockLocalStorage {
    constructor() {
        this.items = new Map()
    }

    getItem(key) { return this.items.get(key)}
    setItem(key, value) { this.items.set(key, value)}
}