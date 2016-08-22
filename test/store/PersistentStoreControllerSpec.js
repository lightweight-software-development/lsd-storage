const chai = require('chai')
const PersistentStoreController = require('../../main/store/PersistentStoreController')
const {jsEqual, jsMatch} = require('../testutil/ChaiHelpers')


const should = chai.should()
chai.use(jsEqual)
chai.use(jsMatch)


function testAction(name) {
    return {type: 'TEST', data: {name}}
}

function testActionWithId(name, id = uuid.v4()) {
    return {id, type: 'TEST', data: {name}}
}

function update(actions) {
    return PersistentStoreController.newUpdate(actions)
}

function capture(eventSource) {
    const events = []
    eventSource.sendTo(x => events.push(x))
    return events
}

function captureFlat(eventSource) {
    const events = []
    eventSource.sendFlatTo(x => events.push(x))
    return events
}

describe("Persistent store controller", function () {
    this.timeout(100)

    const [action1, action2, action3] = ["One", "Two", "Three"].map(testAction)
    const [savedAction1, savedAction2, savedAction3, savedAction4, savedAction5] = ["One", "Two", "Three", "Four", "Five"].map(testActionWithId)

    let controller

    beforeEach("set up app", function () {
        controller = new PersistentStoreController()
    })

    describe("On action from app", function () {

        it("stores actions from app and requests updates and does not request again until received and sends action to app when updates received", function () {
            const updatesRequested = capture(controller.updatesRequested)

            controller.actionFromApp(action1)
            controller.actionToStore.latestEvent.should.containSubset(action1)
            controller.actionToStore.latestEvent.id.should.not.be.null
            updatesRequested.length.should.eql(1)
            should.not.exist(controller.actionsToApply.latestEvent)

            const testAction1WithId = controller.actionToStore.latestEvent
            controller.localStoredActions([testAction1WithId])

            controller.actionFromApp(action2)
            controller.actionToStore.latestEvent.should.containSubset(action2)
            updatesRequested.length.should.eql(1)
            should.not.exist(controller.actionsToApply.latestEvent)

            const testAction2WithId = controller.actionToStore.latestEvent
            controller.localStoredActions([testAction1WithId, testAction2WithId])

            controller.remoteUpdates([])
            controller.actionsToApply.latestEvent.should.jsEql([testAction1WithId, testAction2WithId])


            controller.actionFromApp(action3)
            controller.actionToStore.latestEvent.should.containSubset(action3)
            updatesRequested.length.should.eql(2)
            controller.actionsToApply.latestEvent.should.jsEql([testAction1WithId, testAction2WithId])
        })
    })

    describe("On Startup", function () {
        it("if offline: sends actions from local stored updates then requests updates from store", function () {
            const actionsOutput = []
            controller.remoteStoreAvailable(false)
            controller.actionsToApply.sendFlatTo(x => actionsOutput.push(x))

            controller.localStoredActions([savedAction1, savedAction2])
            controller.localStoredUpdates([update([savedAction3, savedAction4]), update([savedAction5])])
            should.not.exist(controller.actionsToApply.latestEvent)
            actionsOutput.should.be.empty

            controller.init()
            controller.actionsToApply.latestEvent.should.jsMatch([savedAction3, savedAction4, savedAction5])
            actionsOutput.should.eql([savedAction3, savedAction4, savedAction5])
            controller.updatesRequested.latestEvent.should.eql(true)
        })

        it("if online: sends actions from local stored updates then requests updates from store", function () {
            const actionsOutput = captureFlat(controller.actionsToApply)
            controller.remoteStoreAvailable(true)

            controller.localStoredActions([savedAction1, savedAction2])
            controller.localStoredUpdates([update([savedAction3, savedAction4]), update([savedAction5])])
            should.not.exist(controller.actionsToApply.latestEvent)
            actionsOutput.should.be.empty

            controller.init()
            controller.actionsToApply.latestEvent.should.jsMatch([savedAction3, savedAction4, savedAction5])
            actionsOutput.should.eql([savedAction3, savedAction4, savedAction5])
            controller.updatesRequested.latestEvent.should.eql(true)
        })

    })

    describe("Remote store available", function () {
        it("When becomes available Starts sync by request updates", function () {
            controller.remoteStoreAvailable(false)
            controller.localStoredActions([savedAction1, savedAction2])

            controller.remoteStoreAvailable(true)
            should.not.exist(controller.actionsToApply.latestEvent)
            controller.updatesRequested.latestEvent.should.eql(true)
        })

        it("When becomes unavailable does nothing", function () {
            controller.remoteStoreAvailable(true)
            controller.localStoredActions([savedAction1, savedAction2])

            const updatesRequested = capture(controller.updatesRequested)
            controller.remoteStoreAvailable(false)
            should.not.exist(controller.actionsToApply.latestEvent)
            updatesRequested.length.should.be.empty
        })
    })

    describe("Update check requested", function () {
        it("Starts sync by request updates even if remote store unavailable", function () {
            controller.remoteStoreAvailable(false)
            controller.localStoredActions([savedAction1, savedAction2])

            controller.checkForUpdates()
            should.not.exist(controller.actionsToApply.latestEvent)
            controller.updatesRequested.latestEvent.should.eql(true)
        })
    })

    describe("On remoteUpdates", function () {
        it("saves updates, applies actions from updates and deletes them from local store, applies other local actions, sends updates with outstanding actions if store available", function () {
            const actionsOutput = captureFlat(controller.actionsToApply)
            const actionsDeleted = captureFlat(controller.actionsToDelete)
            const updatesStored = capture(controller.updateToStoreLocal)
            const updates = [update([savedAction3, savedAction4]), update([savedAction5])]

            controller.localStoredActions([savedAction1, savedAction2])
            controller.remoteStoreAvailable(true)
            controller.remoteUpdates(updates)

            updatesStored.should.eql(updates)
            actionsOutput.should.eql([savedAction3, savedAction4, savedAction5, savedAction1, savedAction2])
            actionsDeleted.should.eql([savedAction3, savedAction4, savedAction5])
            controller.actionsToApply.latestEvent.toJS().should.eql([savedAction1, savedAction2])
            controller.actionsToDelete.latestEvent.should.eql([savedAction5])
            const storedUpdate = controller.updateToStoreRemote.latestEvent
            storedUpdate.actions.toJS().should.eql([savedAction1, savedAction2])
            storedUpdate.id.should.not.be.null
        })

        it("after empty updates: applies other local actions, sends update with outstanding actions if store available", function () {
            const actionsOutput = captureFlat(controller.actionsToApply)
            const actionsDeleted = captureFlat(controller.actionsToDelete)
            const updatesStored = capture(controller.updateToStoreLocal)

            controller.localStoredActions([savedAction1, savedAction2])
            controller.remoteStoreAvailable(true)
            controller.remoteUpdates([])

            updatesStored.should.eql([])
            actionsOutput.should.eql([savedAction1, savedAction2])
            actionsDeleted.should.eql([])
            controller.actionsToApply.latestEvent.toJS().should.eql([savedAction1, savedAction2])
            controller.updateToStoreRemote.latestEvent.actions.toJS().should.eql([savedAction1, savedAction2])
        })

        it("after any updates: applies other local actions, does not sends update if store not available", function () {
            const actionsOutput = captureFlat(controller.actionsToApply)
            const actionsDeleted = captureFlat(controller.actionsToDelete)
            const updatesStored = capture(controller.updateToStoreLocal)

            controller.localStoredActions([savedAction1, savedAction2])
            controller.remoteStoreAvailable(false)
            controller.remoteUpdates([])

            updatesStored.should.eql([])
            actionsOutput.should.eql([savedAction1, savedAction2])
            actionsDeleted.should.eql([])
            controller.actionsToApply.latestEvent.toJS().should.eql([savedAction1, savedAction2])
            should.not.exist(controller.updateToStoreRemote.latestEvent)
        })

        it("after any updates: does not sends update if no local actions", function () {
            const actionsOutput = captureFlat(controller.actionsToApply)
            const actionsDeleted = captureFlat(controller.actionsToDelete)
            const updatesStored = capture(controller.updateToStoreLocal)
            const updates = [update([savedAction3, savedAction4])]

            controller.localStoredActions([])
            controller.remoteStoreAvailable(true)
            controller.remoteUpdates(updates)

            updatesStored.should.eql(updates)
            actionsOutput.should.eql([savedAction3, savedAction4])
            actionsDeleted.should.eql([savedAction3, savedAction4])
            controller.actionsToApply.latestEvent.should.jsEql([savedAction3, savedAction4])
            controller.actionsToDelete.latestEvent.should.eql([savedAction3, savedAction4])
            should.not.exist(controller.updateToStoreRemote.latestEvent)
        })
    })

})
