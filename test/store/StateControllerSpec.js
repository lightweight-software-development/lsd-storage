let chai = require('chai'),
    chaiSubset = require('chai-subset'),
    sinon = require("sinon"),
    sinonChai = require("sinon-chai"),
    _ = require('lodash'),
    uuid = require('node-uuid'),
    StateController = require('../../main/store/StateController')

const should = chai.should();
chai.use(chaiSubset);
chai.use(sinonChai);

function testAction(name) {
    return {type: 'TEST', data: {name}}
}

function testActionWithId(name, id = uuid.v4()) {
    return {id, type: 'TEST', data: {name}}
}

describe("State controller", function () {
    this.timeout(100);

    let controller, state

    beforeEach("set up", function () {
        state = new TestState(0)
        controller = new StateController(state);
    })

    beforeEach("capture console messages", function() {
        sinon.spy(console, 'error');
    })

    afterEach("stop capture console messages", function() {
        console.error.restore();
    })

    it("sends new action when update but does not change state", function () {
        controller.update("add", 2)

        controller.newAction.latestEvent.should.eql({type: "add", data: 2})
        controller.appState.count.should.eql(0)
        controller.appState.should.equal(state)
    })

    it("applies action and changes state", function () {
        controller.applyAction({type: "add", data: 2})

        should.not.exist(controller.newAction.latestEvent)
        controller.appState.count.should.eql(2)
        controller.appState.should.not.equal(state)
    })

    it("logs error and continues if unknown action", function () {
        controller.applyAction({type: "xxx", data: 99})
        controller.appState.should.equal(state)

        console.error.should.have.been.calledWith("Method xxx not found on TestState 0")
    })
})

class TestState {
    constructor(initialCount) {
        this._count = initialCount
    }

    get count() {
        return this._count
    }

    add(n) {
        return new TestState(this._count + n)
    }

    toString() {
        return this.constructor.name + " " + this._count
    }
}
