const {ObservableEvent, bindFunctions} = require('lsd-observable')
const PersistentStoreController = require('./PersistentStoreController')

module.exports = class PersistentStore {

    constructor(localStore, remoteStore) {
        this.localStore = localStore
        this.remoteStore = remoteStore
        this.externalAction = new ObservableEvent()
        this.controller = new PersistentStoreController()
        bindFunctions(this)
        this._assembleComponents()
    }

    init() {
        this.controller.init()
    }

    dispatchAction(action) {
        this.controller.actionFromApp(action);
    }

    _assembleComponents() {
        const {localStore, remoteStore, controller} = this;

        controller.actionsToApply.sendFlatTo(this.externalAction)

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