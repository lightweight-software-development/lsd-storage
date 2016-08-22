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

describe("Persistent store controller", function () {
    this.timeout(100)

    const [action1, action2, action3] = ["One", "Two", "Three"].map(testAction)
    const [savedAction1, savedAction2, savedAction3] = ["One", "Two", "Three"].map(testActionWithId)

    let controller

    beforeEach("set up app", function () {
        controller = new PersistentStoreController()
    })

    it("no action to store if none from app", function () {
        should.not.exist(controller.actionToStore.latestEvent)
        controller.localStoredActions([savedAction1])
        should.not.exist(controller.actionToStore.latestEvent)
    })

    it("stores action from app with id", function () {
        controller.actionFromApp(action1)
        controller.actionToStore.latestEvent.should.containSubset(action1)
        controller.actionToStore.latestEvent.id.should.not.be.null
    })

    it("stores actions from app and sends back to state controller", function () {
        controller.actionFromApp(action1)
        controller.actionToStore.latestEvent.should.containSubset(action1)
        controller.actionsToApply.latestEvent.should.containSubset([action1])
        const testAction1WithId = controller.actionToStore.latestEvent

        controller.localStoredActions([testAction1WithId])

        controller.actionFromApp(action2)
        controller.actionToStore.latestEvent.should.containSubset(action2)
        controller.actionsToApply.latestEvent.should.containSubset([action2])
    })

    it("stores actions from app when they are added to the local store and sent back to controller synchronously", function () {
        const actionsStored = []
        controller.actionToStore.sendTo( x => {actionsStored.push(x); controller.localStoredActions(actionsStored)} )

        controller.actionFromApp(action1)
        controller.actionFromApp(action2)

        actionsStored.should.containSubset([action1, action2])
    })

    it("on startup sends actions from local stored updates to actions to apply", function () {
        const actionsOutput = []
        controller.actionsToApply.sendFlatTo( x => actionsOutput.push(x) )

        controller.localStoredUpdates([update([savedAction1, savedAction2]), update([savedAction3])])
        should.not.exist(controller.actionsToApply.latestEvent)
        actionsOutput.should.be.empty

        controller.init()
        controller.actionsToApply.latestEvent.should.jsMatch([savedAction1, savedAction2, savedAction3])
        actionsOutput.should.eql([savedAction1, savedAction2, savedAction3])
    })

    it("on startup sends actions from local stored actions to actions to apply", function () {
        const actionsOutput = []
        controller.actionsToApply.sendFlatTo( x => actionsOutput.push(x) )

        controller.localStoredActions([savedAction1, savedAction2])
        should.not.exist(controller.actionsToApply.latestEvent)
        actionsOutput.should.be.empty

        controller.init()
        controller.actionsToApply.latestEvent.should.jsMatch([savedAction1, savedAction2])
        actionsOutput.should.eql([savedAction1, savedAction2])
    })


    it("on startup sends actions from local stored updates then local stored actions to actions to apply", function () {
        const actionsOutput = []
        controller.actionsToApply.sendFlatTo( x => actionsOutput.push(x) )

        controller.localStoredActions([savedAction1])
        controller.localStoredUpdates([update([savedAction2, savedAction3])])
        should.not.exist(controller.actionsToApply.latestEvent)
        actionsOutput.should.be.empty

        controller.init()
        controller.actionsToApply.latestEvent.should.jsMatch([savedAction2, savedAction3, savedAction1])
        actionsOutput.should.eql([savedAction2, savedAction3, savedAction1])
    })

    it("sends update to remote store once only when local stored actions with store already available", function () {
        controller.remoteStoreAvailable(true)
        should.not.exist(controller.updateToStoreRemote.latestEvent)

        controller.localStoredActions([action1, action2])
        const storedUpdate = controller.updateToStoreRemote.latestEvent
        storedUpdate.actions.should.jsMatch([action1, action2])
        storedUpdate.id.should.not.be.null
    })

    it("sends update to remote store once only when store becomes available", function () {
        controller.localStoredActions([action1, action2])
        should.not.exist(controller.updateToStoreRemote.latestEvent)

        controller.remoteStoreAvailable(true)
        const storedUpdate = controller.updateToStoreRemote.latestEvent
        storedUpdate.actions.should.jsMatch([action1, action2])
    })

    it("sends no update to remote store when local stored actions removed", function () {
        const updatesSent = []
        controller.updateToStoreRemote.sendTo( x => {updatesSent.push(x)} )

        controller.localStoredActions([action1, action2])
        controller.remoteStoreAvailable(true)
        const storedUpdate = updatesSent[0]
        storedUpdate.actions.should.jsMatch([action1, action2])

        controller.updateStoredRemote(storedUpdate)
        updatesSent.length.should.eql(1)

        controller.localStoredActions()
        updatesSent.length.should.eql(1)
    })

    it("sends ids to delete and update to local store once only when update stored in remote and changes synchronous", function () {
        let deletedActions, updateToStore
        controller.actionsToDelete.sendTo( (actions) => { deletedActions = actions; controller.localStoredActions([])  })
        controller.updateToStoreLocal.sendTo( (update) => { updateToStore = update; controller.localStoredUpdates([update])  })

        controller.updateStoredRemote(update([savedAction1, savedAction2]))
        deletedActions.should.eql([savedAction1, savedAction2])
        updateToStore.actions.should.containSubset([savedAction1, savedAction2])
    })

})
