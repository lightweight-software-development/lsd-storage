const uuid = require('node-uuid')
const {List} = require('immutable')

const {ObservableEvent} = require('lsd-observable')

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
        this.actionToStore = new ObservableEvent()
        this.actionsToApply = new ObservableEvent()
        this.updateToStoreLocal = new ObservableEvent()
        this.actionsToDelete = new ObservableEvent()
        this.updateToStoreRemote = new ObservableEvent()

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
        this.actionsToApply.send(allActions)
    }

    actionFromApp(action) {
        const actionWithId = Object.assign({id: PersistentStoreController.newId()}, action)
        this._actionsFromApp = this._actionsFromApp.push(actionWithId)
        this.actionToStore.send(actionWithId)
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
        this._sendUpdateToStoreRemote()
    }


    // Outgoing
    _sendUpdateToStoreRemote() {
        const actions = this._localStoredActions
        if (actions.size && this._remoteStoreAvailable) {
            this.updateToStoreRemote.send(PersistentStoreController.newUpdate(actions))
        }
    }
}

module.exports = PersistentStoreController

