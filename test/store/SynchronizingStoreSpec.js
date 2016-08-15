let chai = require('chai'),
    chaiSubset = require('chai-subset'),
    sinon = require("sinon"),
    sinonChai = require("sinon-chai"),
    _ = require('lodash'),
    uuid = require('node-uuid'),
    LocalStorageUpdateStore = require('../../main/store/LocalStorageUpdateStore'),
    SynchronizingStore = require('../../main/store/SynchronizingStore')

chai.should();
chai.use(chaiSubset);
chai.use(sinonChai);

function testAction(name) {
    return {type: 'TEST', data: {name}}
}

function testActionWithId(name, id = uuid.v4()) {
    return {id, type: 'TEST', data: {name}}
}

function mockObject(...methodNames) {
    function dummy() {}
    const mock = {}
    methodNames.forEach( m => {
        mock[m] =  sinon.spy()
    })

    return mock
}

describe("Synchronizing Store", function () {
    this.timeout(100);

    let store, reduxStore, localStore, storage

    beforeEach("set up app", function () {
        storage = new MockLocalStorage()
        localStore = new LocalStorageUpdateStore('test_app', storage)
        reduxStore = mockObject('dispatch', 'getState', 'subscribe')
        store = new SynchronizingStore(reduxStore, localStore);
    })

    it("returns result of getState and subscribe from redux store", function () {
        reduxStore.getState = sinon.stub().returns("getStateReply")
        reduxStore.subscribe = sinon.stub().returns("subscribeReply")

        store.getState().should.equal("getStateReply")
        store.subscribe("subscribeArg").should.equal("subscribeReply")
        reduxStore.subscribe.should.have.been.calledWith("subscribeArg")
    });

    it("dispatches to redux store and stores locally with id", function () {
        const action1 = testAction("One")
        store.dispatch(action1)

        reduxStore.dispatch.should.have.been.calledWith(action1)
        storage.getItem("test_app.actions").should.eql(JSON.stringify([action1]))
        action1.id.should.not.be.null
    })

    it("applies actions from local store on init", function () {
        const action1 = testAction("One")
        const action2 = testAction("Two")
        storage.setItem("test_app.actions", JSON.stringify([action1, action2]))

        store.init()

        reduxStore.dispatch.getCall(0).should.have.been.calledWithExactly(action1)
        reduxStore.dispatch.getCall(1).should.have.been.calledWithExactly(action2)

    });

    it("applies only actions not already applied", function () {
        const action1 = testActionWithId("One")
        const action2 = testActionWithId("Two")
        const action3 = testActionWithId("Three")

        storage.setItem("test_app.actions", JSON.stringify([action1, action3]))
        store.init()

        storage.setItem("test_app.actions", JSON.stringify([action3, action2]))
        store.init()

        reduxStore.dispatch.callCount.should.equal(3)
        reduxStore.dispatch.getCall(0).should.have.been.calledWithExactly(action1)
        reduxStore.dispatch.getCall(1).should.have.been.calledWithExactly(action3)
        reduxStore.dispatch.getCall(2).should.have.been.calledWithExactly(action2)
    });


})

class MockLocalStorage {
    constructor() {
        this.items = new Map()
    }

    getItem(key) { return this.items.get(key)}
    setItem(key, value) { this.items.set(key, value)}
}
