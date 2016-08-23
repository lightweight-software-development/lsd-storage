const uuid = require('node-uuid')
const {List, Set} = require('immutable')

const {ObservableEvent, bindFunctions} = require('lsd-observable')

class PersistentStoreController {

    static newId() {
        const ensureUnique = Math.floor(Math.random() * 1000000)
        return Date.now() + '-' + ensureUnique
    }

    static newUpdate(actions) {
        return {
            id: PersistentStoreController.newId(),
            actions: actions
        }
    }

    constructor() {
        this._updatesRequestInFlight = false
        this._actionIdsApplied = new Set()
        this._localStoredActions = new List()
        this._localStoredUpdates = new List()
        this._remoteStoreAvailable = false
        this._started = false

        // outgoing data
        this.actionToStore = new ObservableEvent()
        this.actionsToApply = new ObservableEvent()
        this.updateToStoreLocal = new ObservableEvent()
        this.actionsToDelete = new ObservableEvent()
        this.updateToStoreRemote = new ObservableEvent()
        this.updatesRequested = new ObservableEvent()
        bindFunctions(this)
    }


    // Incoming
    init() {
        const actionsFromUpdates = this._localStoredUpdates.reduce((acc, val) => acc.concat(val.actions), [])
        if (actionsFromUpdates.length) {
            this.actionsToApply.send(actionsFromUpdates)
        }
        this._requestUpdates()
        this._started = true
    }

    actionFromApp(action) {
        const actionWithId = Object.assign({id: PersistentStoreController.newId()}, action)
        this.actionToStore.send(actionWithId)
        this._requestUpdates()
    }

    checkForUpdates() {
        this._requestUpdates()
    }

    localStoredActions(actions) {
        this._localStoredActions = List(actions)
    }

    localStoredUpdates(updates) {
        this._localStoredUpdates = List(updates)
    }

    updateStoredRemote(update) {
        this.updateToStoreLocal.send(update)
        this.actionsToDelete.send(update.actions)
    }

    remoteStoreAvailable(isAvailable) {
        this._remoteStoreAvailable = isAvailable
        if (this._started && isAvailable) {
            this._requestUpdates()
        }
    }

    remoteUpdates(updates) {
        this._updatesRequestInFlight = false
        updates.forEach(u => {
            if (!this._inLocalStoredUpdates(u)) {
                this.updateToStoreLocal.send(u)
                this.actionsToApply.send(u.actions)
                this.actionsToDelete.send(u.actions)
            }
        })
        if (this._localStoredActions.size) {
            this._sendNewActionsToApp(this._localStoredActions)
        }
        this._sendUpdateToStoreRemote()
    }

    _inLocalStoredUpdates(update) {
        return !!this._localStoredUpdates.find(u => u.id === update.id)
    }

    // Outgoing
    _sendUpdateToStoreRemote() {
        const actions = this._localStoredActions
        if (actions.size && this._remoteStoreAvailable) {
            this.updateToStoreRemote.send(PersistentStoreController.newUpdate(actions))
        }
    }

    _requestUpdates() {
        if (!this._updatesRequestInFlight) {
            this.updatesRequested.send(true)
            this._updatesRequestInFlight = true
        }
    }

    _sendNewActionsToApp(actions) {
        const unsentActions = actions.filter(x => !this._actionIdsApplied.has(x.id))
        this.actionsToApply.send(unsentActions)
        this._actionIdsApplied = this._actionIdsApplied.union(unsentActions.map(x => x.id))
    }
}

module.exports = PersistentStoreController

