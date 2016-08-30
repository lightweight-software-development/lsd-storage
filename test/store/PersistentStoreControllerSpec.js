const chai = require('chai')
const PersistentStoreController = require('../../main/store/PersistentStoreController')
const {jsEqual, jsMatch} = require('../testutil/ChaiHelpers')
const {capture, captureFlat} = require('../testutil/Helpers')

const should = chai.should()
chai.use(jsEqual)
chai.use(jsMatch)


function testAction(name) {
    return {type: 'TEST', data: {name}}
}

function newUpdate(name) {
    return { actions: [testAction(name)] }
}

function testUpdateWithId(name, id = uuid.v4()) {
    return {id, actions: [testAction(name)]}
}

describe("Persistent store controller", function () {

    const [update1, update2, update3] = ["One", "Two", "Three"].map(newUpdate)
    const [savedUpdate1, savedUpdate2, savedUpdate3, savedUpdate4, savedUpdate5] = ["One", "Two", "Three", "Four", "Five"].map(testUpdateWithId)

    let controller

    beforeEach("set up app", function () {
        controller = new PersistentStoreController()
    })

    describe("On update from app", function () {

        it("stores update from app and requests remote updates once and sends local updates back to app when remote updates received", function () {
            const updatesRequested = capture(controller.updatesRequested)

            controller.updateFromApp(update1)
            controller.unsavedUpdateToStore.latestEvent.should.containSubset(update1)
            controller.unsavedUpdateToStore.latestEvent.id.should.not.be.null
            updatesRequested.length.should.eql(1)
            should.not.exist(controller.updatesToApply.latestEvent)

            const update1WithId = controller.unsavedUpdateToStore.latestEvent
            controller.localUnstoredUpdates([update1WithId])

            controller.updateFromApp(update2)
            controller.unsavedUpdateToStore.latestEvent.should.containSubset(update2)
            updatesRequested.length.should.eql(1)
            should.not.exist(controller.updatesToApply.latestEvent)

            const update2WithId = controller.unsavedUpdateToStore.latestEvent
            controller.localUnstoredUpdates([update1WithId, update2WithId])

            controller.remoteUpdates([])
            controller.updatesToApply.latestEvent.should.jsEql([update1WithId, update2WithId])


            controller.updateFromApp(update3)
            controller.unsavedUpdateToStore.latestEvent.should.containSubset(update3)
            updatesRequested.length.should.eql(2)
            controller.updatesToApply.latestEvent.should.jsEql([update1WithId, update2WithId])
        })
    })

    describe("On Startup", function () {
        it("if offline: applies local stored updates then requests updates from store", function () {
            const updatesOutput = []
            controller.remoteStoreAvailable(false)
            controller.updatesToApply.sendFlatTo(x => updatesOutput.push(x))

            controller.localUnstoredUpdates([savedUpdate1, savedUpdate2])
            controller.localStoredUpdates([savedUpdate3, savedUpdate4, savedUpdate5])
            should.not.exist(controller.updatesToApply.latestEvent)
            updatesOutput.should.be.empty

            controller.init()
            controller.updatesToApply.latestEvent.should.jsMatch([savedUpdate3, savedUpdate4, savedUpdate5])
            updatesOutput.should.eql([savedUpdate3, savedUpdate4, savedUpdate5])
            controller.updatesRequested.latestEvent.should.eql(true)
        })

        it("if online: applies local stored updates then requests updates from store", function () {
            const updatesApplied = captureFlat(controller.updatesToApply)
            controller.remoteStoreAvailable(true)

            controller.localUnstoredUpdates([savedUpdate1, savedUpdate2])
            controller.localStoredUpdates([savedUpdate3, savedUpdate4, savedUpdate5])
            should.not.exist(controller.updatesToApply.latestEvent)
            updatesApplied.should.be.empty

            controller.init()
            controller.updatesToApply.latestEvent.should.jsMatch([savedUpdate3, savedUpdate4, savedUpdate5])
            updatesApplied.should.eql([savedUpdate3, savedUpdate4, savedUpdate5])
            controller.updatesRequested.latestEvent.should.eql(true)
        })

    })

    describe("Remote store available", function () {
        it("When becomes available after init Starts sync by request updates", function () {
            controller.remoteStoreAvailable(false)
            controller.localUnstoredUpdates([savedUpdate1, savedUpdate2])
            controller.init()

            controller.remoteStoreAvailable(true)
            should.not.exist(controller.updatesToApply.latestEvent)
            controller.updatesRequested.latestEvent.should.eql(true)
        })

        it("When becomes available before init does nothing", function () {
            controller.remoteStoreAvailable(false)
            controller.localUnstoredUpdates([savedUpdate1, savedUpdate2])

            const updatesRequested = capture(controller.updatesRequested)
            controller.remoteStoreAvailable(true)
            should.not.exist(controller.updatesToApply.latestEvent)
            updatesRequested.length.should.be.empty
        })

        it("When becomes unavailable does nothing", function () {
            controller.remoteStoreAvailable(true)
            controller.localUnstoredUpdates([savedUpdate1, savedUpdate2])

            const updatesRequested = capture(controller.updatesRequested)
            controller.remoteStoreAvailable(false)
            should.not.exist(controller.updatesToApply.latestEvent)
            updatesRequested.length.should.be.empty
        })
    })

    describe("Update check requested", function () {
        it("Starts sync by request updates even if remote store unavailable", function () {
            controller.remoteStoreAvailable(false)
            controller.localStoredUpdates([savedUpdate1, savedUpdate2])

            controller.checkForUpdates()
            should.not.exist(controller.updatesToApply.latestEvent)
            controller.updatesRequested.latestEvent.should.eql(true)
        })
    })

    describe("On remoteUpdates", function () {
        it("saves remote updates, applies them and deletes them from local store, applies other unstored updates, sends unstored updates to remote", function () {
            const updatesApplied = captureFlat(controller.updatesToApply)
            const updatesDeleted = captureFlat(controller.updatesToDelete)
            const updatesStoredLocal = capture(controller.updateToStoreLocal)
            const updatesStoredRemote = capture(controller.updateToStoreRemote)
            const updates = [savedUpdate3, savedUpdate4, savedUpdate5]

            controller.localUnstoredUpdates([savedUpdate1, savedUpdate2])
            controller.remoteStoreAvailable(true)
            controller.remoteUpdates(updates)

            updatesStoredLocal.should.eql(updates)
            updatesApplied.should.eql([savedUpdate3, savedUpdate4, savedUpdate5, savedUpdate1, savedUpdate2])
            updatesDeleted.should.eql([savedUpdate3, savedUpdate4, savedUpdate5])
            controller.updatesToApply.latestEvent.toJS().should.eql([savedUpdate1, savedUpdate2])
            controller.updatesToDelete.latestEvent.should.eql([savedUpdate3, savedUpdate4, savedUpdate5])
            updatesStoredRemote.should.eql([savedUpdate1, savedUpdate2])
        })

        it("ignores updates already in local store", function () {
            const updatesApplied = captureFlat(controller.updatesToApply)
            const updatesDeleted = captureFlat(controller.updatesToDelete)
            const updatesStored = capture(controller.updateToStoreLocal)

            controller.localStoredUpdates([savedUpdate3])
            controller.remoteStoreAvailable(true)
            controller.remoteUpdates([savedUpdate3, savedUpdate4])

            updatesStored.should.eql([savedUpdate4])
            updatesApplied.should.eql([savedUpdate4])
            updatesDeleted.should.eql([savedUpdate4])
            should.not.exist(controller.updateToStoreRemote.latestEvent)
        })

        it("updates in local store sent to app when store not available", function () {
            const updatesApplied = captureFlat(controller.updatesToApply)
            const remoteUpdatesStored = capture(controller.updateToStoreRemote)

            controller.remoteStoreAvailable(false)
            controller.localUnstoredUpdates([savedUpdate1, savedUpdate2])

            controller.remoteUpdates([])
            controller.remoteStoreAvailable(true)
            controller.remoteUpdates([])

            remoteUpdatesStored.length.should.eql(2)
            updatesApplied.length.should.eql(2)
        })

        it("after empty updates: applies other local updates, sends local updates if store available", function () {
            const updatesApplied = captureFlat(controller.updatesToApply)
            const updatesDeleted = captureFlat(controller.updatesToDelete)
            const updatesStoredLocal = capture(controller.updateToStoreLocal)
            const updatesStoredRemote = capture(controller.updateToStoreRemote)

            controller.localUnstoredUpdates([savedUpdate1, savedUpdate2])
            controller.remoteStoreAvailable(true)
            controller.remoteUpdates([])

            updatesStoredLocal.should.eql([])
            updatesApplied.should.eql([savedUpdate1, savedUpdate2])
            updatesDeleted.should.eql([])
            controller.updatesToApply.latestEvent.toJS().should.eql([savedUpdate1, savedUpdate2])
            updatesStoredRemote.should.eql([savedUpdate1, savedUpdate2])
        })

        it("after any updates: applies other local updates, does not send update if store not available", function () {
            const updatesApplied = captureFlat(controller.updatesToApply)
            const updatesDeleted = captureFlat(controller.updatesToDelete)
            const updatesStoredLocal = capture(controller.updateToStoreLocal)

            controller.localUnstoredUpdates([savedUpdate1, savedUpdate2])
            controller.remoteStoreAvailable(false)
            controller.remoteUpdates([])

            updatesStoredLocal.should.eql([])
            updatesApplied.should.eql([savedUpdate1, savedUpdate2])
            updatesDeleted.should.eql([])
            controller.updatesToApply.latestEvent.toJS().should.eql([savedUpdate1, savedUpdate2])
            should.not.exist(controller.updateToStoreRemote.latestEvent)
        })

        it("after any updates: does not send any update if no local updates", function () {
            const updatesApplied = captureFlat(controller.updatesToApply)
            const updatesDeleted = captureFlat(controller.updatesToDelete)
            const updatesStoredLocal = capture(controller.updateToStoreLocal)
            const updates = [savedUpdate3, savedUpdate4]

            controller.localUnstoredUpdates([])
            controller.remoteStoreAvailable(true)
            controller.remoteUpdates(updates)

            updatesStoredLocal.should.eql(updates)
            updatesApplied.should.eql(updates)
            updatesDeleted.should.eql(updates)
            controller.updatesToApply.latestEvent.should.jsEql(updates)
            controller.updatesToDelete.latestEvent.should.eql(updates)
            should.not.exist(controller.updateToStoreRemote.latestEvent)
        })
    })

    describe("on update stored remote", function () {
        it("stores update locally and deletes unstored one", function () {
            const updatesDeleted = captureFlat(controller.updatesToDelete)
            const updatesStoredLocal = capture(controller.updateToStoreLocal)
            controller.updateStoredRemote(savedUpdate1)

            updatesStoredLocal.should.eql([savedUpdate1])
            updatesDeleted.should.eql([savedUpdate1])

        })
    })

})
