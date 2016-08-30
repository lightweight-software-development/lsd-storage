const {ObservableValue, bindFunctions} = require('lsd-observable')

class LocalUpdateStore {

    constructor(storage) {
        this.storage = storage || { unsavedUpdates: [], updates: [] }
        this.allUnsavedUpdates = new ObservableValue(this.storage.unsavedUpdates)
        this.allUpdates = new ObservableValue(this.storage.updates)
        bindFunctions(this)
    }

    storeUnsavedUpdate(update) {
        const updatedUnsavedUpdates = this.allUnsavedUpdates.value.concat(update)
        this.allUnsavedUpdates.value =  updatedUnsavedUpdates
        this.storage.unsavedUpdates = updatedUnsavedUpdates
    }

    deleteUnsavedUpdates(actions) {
        const deletedIds = new Set(actions.map( a => a.id))
        const updatedUnsavedUpdates = this.allUnsavedUpdates.value.filter(a => !deletedIds.has(a.id) )
        this.storage.unsavedUpdates = updatedUnsavedUpdates
        this.allUnsavedUpdates.value = updatedUnsavedUpdates
    }

    storeUpdate(update) {
        const updatedUpdates = this.allUpdates.value.concat(update)
        this.allUpdates.value = updatedUpdates
        this.storage.updates = updatedUpdates
    }

}

module.exports = LocalUpdateStore