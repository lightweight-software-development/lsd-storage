const ObservableData = require('lsd-observable').ObservableData
const bindFunctions = require('lsd-observable').bindFunctions
const JsonUtil = require('../json/JsonUtil')

class LocalStorageUpdateStore {

    constructor(appId, dataSet) {
        this.actionStoreKey = `${appId}.${dataSet}.actions`
        this.updateStoreKey = `${appId}.${dataSet}.updates`
        this.storage = window.localStorage
        this.allActions = new ObservableData(this._getFromStorage(this.actionStoreKey))
        this.allUpdates = new ObservableData(this._getFromStorage(this.updateStoreKey))
        bindFunctions(this)
    }

    storeAction(action) {
        const updatedActions = this.allActions.value.concat(action)
        this.allActions.value = this._writeToStorage(this.actionStoreKey, updatedActions)
    }

    deleteActions(actions) {
        const deletedIds = new Set(actions.map( a => a.id))
        const updatedActions = this.allActions.value.filter( a => !deletedIds.has(a.id) )
        this.allActions.value = this._writeToStorage(this.actionStoreKey, updatedActions)
    }

    storeUpdate(update) {
        const updatedUpdates = this.allUpdates.value.concat(update)
        this.allUpdates.value = this._writeToStorage(this.updateStoreKey, updatedUpdates)
    }

    _getFromStorage(key) {
        const json = this.storage.getItem(key) || '[]'
        return JsonUtil.fromStore(json)
    }

    _writeToStorage(key, data) {
        this.storage.setItem(key, JsonUtil.toStore(data))
        return data
    }
}

module.exports = LocalStorageUpdateStore