const chai = require('chai'),
    chaiSubset = require('chai-subset'),
    sinon = require("sinon"),
    sinonChai = require("sinon-chai"),
    _ = require('lodash'),
    uuid = require('node-uuid'),
    {capture, captureFlat} = require('../testutil/Helpers')
    StateController = require('../../main/store/StateController')

const should = chai.should();
chai.use(chaiSubset);
chai.use(sinonChai);

describe("State controller", function () {
    this.timeout(100);

    let controller, state, stateChanges

    beforeEach("set up", function () {
        state = new TestState(0)
        controller = new StateController(state);
        stateChanges = capture(controller.state)
    })

    beforeEach("capture console messages", function() {
        sinon.spy(console, 'error');
    })

    afterEach("stop capture console messages", function() {
        console.error.restore();
    })

    it("sends new update when get update but does not change state", function () {
        controller.update("add", 2)

        controller.newUpdate.latestEvent.should.eql({actions: [{type: "add", data: 2}]})
        controller.appState.count.should.eql(0)
        controller.appState.should.equal(state)
        stateChanges.should.have.lengthOf(1)
    })

    it("sends new update when gets update from client but does not change state", function () {
        controller.updateFromClient({ actions: [ { type: "add", data: 2 } ] })

        controller.newUpdate.latestEvent.should.eql({actions: [{type: "add", data: 2}]})
        controller.appState.count.should.eql(0)
        controller.appState.should.equal(state)
        stateChanges.should.have.lengthOf(1)
    })

    it("applies update and changes state after last action", function () {
        controller.applyUpdate({actions: [{type: "add", data: 2}, {type: "add", data: 3}]})

        should.not.exist(controller.newUpdate.latestEvent)
        controller.appState.count.should.eql(5)
        controller.appState.should.not.equal(state)
        stateChanges.should.have.lengthOf(2)
    })

    it("logs error and continues if unknown action", function () {
        controller.applyUpdate({actions: [{type: "xxx", data: 2}]})
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
