const uuid = require('node-uuid')
const {List} = require('immutable')

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
        this._actionsFromApp = new List()
        this._localStoredActions = new List()
        this._localStoredUpdates = new List()
        this._remoteStoreAvailable = false

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
        this.actionsToApply.send(actionsFromUpdates)
        this._requestUpdates()
        // if (this._remoteStoreAvailable) {
        // } else {
        //     this.actionsToApply.send(this._localStoredActions)
        // }
    }

    actionFromApp(action) {
        const actionWithId = Object.assign({id: PersistentStoreController.newId()}, action)
        this._actionsFromApp = this._actionsFromApp.push(actionWithId)
        this.actionToStore.send(actionWithId)
        this._requestUpdates()
    }

    checkForUpdates() {
        this._requestUpdates()
    }

    localStoredActions(actions) {
        this._localStoredActions = List(actions)
        this._sendUpdateToStoreRemote()
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
        if (isAvailable) {
            this._requestUpdates()
        }
    }

    remoteUpdates(updates) {
        this._updatesRequestInFlight = false
        updates.forEach( u => {
            this.updateToStoreLocal.send(u)
            this.actionsToApply.send(u.actions)
            this.actionsToDelete.send(u.actions)
        })
        if (this._localStoredActions.size) {
            this.actionsToApply.send(this._localStoredActions)
        }
        this._sendUpdateToStoreRemote()
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
}

module.exports = PersistentStoreController

