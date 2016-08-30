const uuid = require('node-uuid')
const {List, Set} = require('immutable')

const {ObservableEvent, bindFunctions} = require('lsd-observable')

class PersistentStoreController {

    constructor() {
        this._updatesRequestInFlight = false
        this._updateIdsApplied = new Set()
        this._localUnstoredUpdates = new List()
        this._localStoredUpdates = new List()
        this._remoteStoreAvailable = false
        this._started = false

        // outgoing data
        this.unsavedUpdateToStore = new ObservableEvent()
        this.updatesToApply = new ObservableEvent()
        this.updateToStoreLocal = new ObservableEvent()
        this.updatesToDelete = new ObservableEvent()
        this.updateToStoreRemote = new ObservableEvent()
        this.updatesRequested = new ObservableEvent()
        bindFunctions(this)
    }


    // Incoming
    init() {
        if (this._localStoredUpdates.size) {
            this.updatesToApply.send(this._localStoredUpdates)
        }
        this._requestUpdates()
        this._started = true
    }

    updateFromApp(update) {
        const updateWithId = Object.assign({id: uuid.v4()}, update)
        this.unsavedUpdateToStore.send(updateWithId)
        this._requestUpdates()
    }

    checkForUpdates() {
        this._requestUpdates()
    }

    localUnstoredUpdates(updates) {
        this._localUnstoredUpdates = List(updates)
    }

    localStoredUpdates(updates) {
        this._localStoredUpdates = List(updates)
    }

    updateStoredRemote(update) {
        this.updateToStoreLocal.send(update)
        this.updatesToDelete.send([update])
    }

    remoteStoreAvailable(isAvailable) {
        this._remoteStoreAvailable = isAvailable
        if (this._started && isAvailable) {
            this._requestUpdates()
        }
    }

    remoteUpdates(updates) {
        this._updatesRequestInFlight = false
        const newUpdates = updates.filter( u => !this._inLocalStoredUpdates(u) )
        newUpdates.forEach(u => this.updateToStoreLocal.send(u))
        this.updatesToApply.send(newUpdates)
        this.updatesToDelete.send(newUpdates)

        if (this._localUnstoredUpdates.size) {
            this._sendNewUpdatesToApp(this._localUnstoredUpdates)
        }
        this._sendUpdateToStoreRemote()
    }

    _inLocalStoredUpdates(update) {
        return !!this._localStoredUpdates.find(u => u.id === update.id)
    }

    // Outgoing
    _sendUpdateToStoreRemote() {
        const updates = this._localUnstoredUpdates
        if (this._remoteStoreAvailable) {
            updates.forEach( u => this.updateToStoreRemote.send(u) )
        }
    }

    _requestUpdates() {
        if (!this._updatesRequestInFlight) {
            this.updatesRequested.send(true)
            this._updatesRequestInFlight = true
        }
    }

    _sendNewUpdatesToApp(updates) {
        const unsentUpdates = updates.filter(x => !this._updateIdsApplied.has(x.id))
        this.updatesToApply.send(unsentUpdates)
        this._updateIdsApplied = this._updateIdsApplied.union(unsentUpdates.map(x => x.id))
    }
}

module.exports = PersistentStoreController

