const UpdateStore = require('./UpdateStore')
const JsonUtil = require('../json/JsonUtil')

class LocalStorageStore {

    constructor(appId, dataSet) {
        Object.assign(this, {appId, dataSet})
        this.actionStoreKey = `${appId}.${dataSet}.actions`
        this.updateStoreKey = `${appId}.${dataSet}.updates`
    }

    get actions() {
        this._getFromStorage(this.actionStoreKey)
    }

    set actions(actions) {
        this._writeToStorage(this.actionStoreKey, actions)
    }

    get updates() {
        this._getFromStorage(this.updateStoreKey)
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

class LocalStorageUpdateStore extends UpdateStore {

    constructor(appId, dataSet) {
        super(new LocalStorageStore(appId, dataSet))
    }
}

module.exports = LocalStorageUpdateStore