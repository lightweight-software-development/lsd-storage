const uuid = require('node-uuid')

const ObservableData = require('lsd-events').ObservableData
const PersistentStoreController = require('./PersistentStoreController')

function newId() {
    return uuid.v4()
}

module.exports = class PersistentStore {

    constructor(localStore, remoteStore) {
        this.localStore = localStore
        this.remoteStore = remoteStore
        this.externalAction = new ObservableData()
        this.dispatchedAction = new ObservableData()
        this.controller = new PersistentStoreController()
        this.dispatchAction = this.dispatchAction.bind(this)

        this._assembleComponents()
    }

    init() {
        this.controller.init()
    }

    dispatchAction(action) {
        const storedAction = Object.assign({id: newId()}, action)
        this.dispatchedAction.value = storedAction;
    }

    _assembleComponents() {
        const {localStore, remoteStore, controller} = this;

        controller.actionsToApply.sendFlatTo(this.externalAction.set)
        this.dispatchedAction.sendTo(controller.actionFromApp)

        controller.actionToStore.sendTo(localStore.storeAction)
        localStore.allActions.sendTo(controller.localStoredActions)
        controller.updateToStoreLocal.sendTo(localStore.storeUpdate)
        controller.actionsToDelete.sendTo(localStore.deleteActions)
        localStore.allUpdates.sendTo(controller.localStoredUpdates)

        remoteStore.storeAvailable.sendTo(controller.remoteStoreAvailable)
        controller.updateToStoreRemote.sendTo(remoteStore.storeUpdate)
        remoteStore.updateStored.sendTo(controller.updateStoredRemote)

    }
}