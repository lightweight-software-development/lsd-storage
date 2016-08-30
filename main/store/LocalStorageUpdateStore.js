const {bindFunctions} = require('lsd-observable')
const LocalUpdateStore = require('./LocalUpdateStore')
const JsonUtil = require('../json/JsonUtil')

class LocalStorageStore {

    constructor(appId, dataSet) {
        Object.assign(this, {appId, dataSet})
        this.storage = window.localStorage
        this.unsavedStoreKey = `${appId}.${dataSet}.unsavedUpdates`
        this.updateStoreKey = `${appId}.${dataSet}.updates`
    }

    get unsavedUpdates() {
        return this._getFromStorage(this.unsavedStoreKey)
    }

    set unsavedUpdates(updates) {
        this._writeToStorage(this.unsavedStoreKey, updates)
    }

    get updates() {
        return this._getFromStorage(this.updateStoreKey)
    }

    set updates(updates) {
        this._writeToStorage(this.updateStoreKey, updates)

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

class LocalStorageUpdateStore  {

    constructor(appId, dataSet) {
        this.localUpdateStore = new LocalUpdateStore(new LocalStorageStore(appId, dataSet))
        bindFunctions(this)
    }

    get allUnsavedUpdates() { return this.localUpdateStore.allUnsavedUpdates }
    get allUpdates() { return this.localUpdateStore.allUpdates }

    storeUnsavedUpdate(update) {
        this.localUpdateStore.storeUnsavedUpdate(update)
    }

    deleteUnsavedUpdates(updates) {
        this.localUpdateStore.deleteUnsavedUpdates(updates)
    }

    storeUpdate(update) {
        this.localUpdateStore.storeUpdate(update)
    }

}

module.exports = LocalStorageUpdateStore