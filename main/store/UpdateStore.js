const {ObservableValue, bindFunctions} = require('lsd-observable')

class UpdateStore {

    constructor(storage) {
        this.storage = storage || { actions: [], updates: [] }
        this.allActions = new ObservableValue(this.storage.actions)
        this.allUpdates = new ObservableValue(this.storage.updates)
        bindFunctions(this)
    }

    storeAction(action) {
        const updatedActions = this.allActions.value.concat(action)
        this.allActions.value = this.storage.actions = updatedActions
    }

    deleteActions(actions) {
        const deletedIds = new Set(actions.map( a => a.id))
        const updatedActions = this.allActions.value.filter( a => !deletedIds.has(a.id) )
        this.allActions.value = this.storage.actions = updatedActions
    }

    storeUpdate(update) {
        const updatedUpdates = this.allUpdates.value.concat(update)
        this.allUpdates.value = this.storage.updates = updatedUpdates
    }

}

module.exports = UpdateStore