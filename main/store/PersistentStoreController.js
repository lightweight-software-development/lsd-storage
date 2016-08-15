const uuid = require('node-uuid')
const {List} = require('immutable')

const ObservableData = require('lsd-events').ObservableData

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
        this._actionsFromApp = new List()
        this._localStoredActions = new List()
        this._localStoredUpdates = new List()
        this._remoteStoreAvailable = false

        // outgoing data
        //TODO use ObservableEvent - no initial update when subscribe, latestEvent instead of value
        this.actionToStore = new ObservableData()
        this.actionsToApply = new ObservableData()
        this.updateToStoreLocal = new ObservableData()
        this.actionsToDelete = new ObservableData()
        this.updateToStoreRemote = new ObservableData()

        this.init = this.init.bind(this)
        this.actionFromApp = this.actionFromApp.bind(this)
        this.localStoredActions = this.localStoredActions.bind(this)
        this.localStoredUpdates = this.localStoredUpdates.bind(this)
        this.updateStoredRemote = this.updateStoredRemote.bind(this)
        this.remoteStoreAvailable = this.remoteStoreAvailable.bind(this)
    }


    // Incoming
    init() {
        const actionsFromUpdates = this._localStoredUpdates.reduce((acc, val) => acc.concat(val.actions), [])
        let allActions = List(actionsFromUpdates).concat(this._localStoredActions)
        this.actionsToApply.set(allActions)
    }

    actionFromApp(action) {
        const actionWithId = Object.assign({id: PersistentStoreController.newId()}, action)
        this._actionsFromApp = this._actionsFromApp.push(actionWithId)
        this.actionToStore.set(actionWithId)
    }

    localStoredActions(actions) {
        this._localStoredActions = List(actions)
        this._sendUpdateToStoreRemote()
    }

    localStoredUpdates(updates) {
        this._localStoredUpdates = List(updates)
    }

    updateStoredRemote(update) {
        this.updateToStoreLocal.set(update)
        this.actionsToDelete.set(update.actions)
    }

    remoteStoreAvailable(isAvailable) {
        this._remoteStoreAvailable = isAvailable
        this._sendUpdateToStoreRemote()
    }


    // Outgoing
    _sendUpdateToStoreRemote() {
        const actions = this._localStoredActions
        if (actions.size && this._remoteStoreAvailable) {
            this.updateToStoreRemote.set(PersistentStoreController.newUpdate(actions))
        }
    }
}

module.exports = PersistentStoreController

