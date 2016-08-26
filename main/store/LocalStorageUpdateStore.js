const {bindFunctions} = require('lsd-observable')
const LocalUpdateStore = require('./LocalUpdateStore')
const JsonUtil = require('../json/JsonUtil')

class LocalStorageStore {

    constructor(appId, dataSet) {
        Object.assign(this, {appId, dataSet})
        this.storage = window.localStorage
        this.actionStoreKey = `${appId}.${dataSet}.actions`
        this.updateStoreKey = `${appId}.${dataSet}.updates`
    }

    get actions() {
        return this._getFromStorage(this.actionStoreKey)
    }

    set actions(actions) {
        this._writeToStorage(this.actionStoreKey, actions)
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

    get allActions() { return this.localUpdateStore.allActions }
    get allUpdates() { return this.localUpdateStore.allUpdates }

    storeAction(action) {
        this.localUpdateStore.storeAction(action)
    }

    deleteActions(actions) {
        this.localUpdateStore.deleteActions(actions)
    }

    storeUpdate(update) {
        this.localUpdateStore.storeUpdate(update)
    }

}

module.exports = LocalStorageUpdateStore