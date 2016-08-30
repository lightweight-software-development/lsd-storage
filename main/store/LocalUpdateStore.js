const {ObservableValue, bindFunctions} = require('lsd-observable')

class LocalUpdateStore {

    constructor(storage) {
        this.storage = storage || { actions: [], updates: [] }
        this.allActions = new ObservableValue(this.storage.actions)
        this.allUpdates = new ObservableValue(this.storage.updates)
        bindFunctions(this)
    }

    storeAction(action) {
        const updatedActions = this.allActions.value.concat(action)
        this.allActions.value =  updatedActions
        this.storage.actions = updatedActions
    }

    deleteActions(actions) {
        const deletedIds = new Set(actions.map( a => a.id))
        const updatedActions = this.allActions.value.filter( a => !deletedIds.has(a.id) )
        this.storage.actions = updatedActions
        this.allActions.value = updatedActions
    }

    storeUpdate(update) {
        const updatedUpdates = this.allUpdates.value.concat(update)
        this.allUpdates.value = updatedUpdates
        this.storage.updates = updatedUpdates
    }

}

module.exports = LocalUpdateStore