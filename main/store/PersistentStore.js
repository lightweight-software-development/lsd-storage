const {ObservableEvent, bindFunctions} = require('lsd-observable')
const PersistentStoreController = require('./PersistentStoreController')

module.exports = class PersistentStore {

    constructor(localStore, remoteStore) {
        this.localStore = localStore
        this.remoteStore = remoteStore
        this.externalUpdate = new ObservableEvent()
        this.controller = new PersistentStoreController()
        bindFunctions(this)
        this._assembleComponents()
    }

    init() {
        this.controller.init()
    }

    dispatchUpdate(update) {
        this.controller.updateFromApp(update);
    }

    checkForUpdates() {
        this.controller.checkForUpdates()
    }

    waitForUpdates() {
        return this.controller.waitForUpdatesComplete()
    }

    _assembleComponents() {
        const {localStore, remoteStore, controller} = this;

        controller.updatesToApply.sendFlatTo(this.externalUpdate)

        controller.unsavedUpdateToStore.sendTo(localStore.storeUnsavedUpdate)
        localStore.allUnsavedUpdates.sendTo(controller.localUnstoredUpdates)
        controller.updateToStoreLocal.sendTo(localStore.storeUpdate)
        controller.updatesToDelete.sendTo(localStore.deleteUnsavedUpdates)
        localStore.allUpdates.sendTo(controller.localStoredUpdates)

        remoteStore.storeAvailable.sendTo(controller.remoteStoreAvailable)
        controller.updateToStoreRemote.sendTo(remoteStore.storeUpdate)
        remoteStore.updateStored.sendTo(controller.updateStoredRemote)

        controller.updatesRequested.sendTo(remoteStore.requestUpdates)
        remoteStore.incomingUpdates.sendTo(controller.remoteUpdates)
    }
}