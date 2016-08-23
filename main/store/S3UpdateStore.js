const {requireAWS} = require('../util/Util')
const AWS = requireAWS()
const {ObservableValue, ObservableEvent, bindFunctions} = require('lsd-observable')
const JsonUtil = require('../json/JsonUtil')


module.exports = class S3UpdateStore {

    constructor(bucketName, keyPrefix, appId, dataSet, credentialsSource) {
        Object.assign(this, {bucketName, keyPrefix, appId, dataSet})

        this.updateStored = new ObservableEvent()
        this.storeAvailable = new ObservableValue(false)
        this.incomingUpdates = new ObservableEvent()
        bindFunctions(this)

        AWS.config.region = 'eu-west-1'
        credentialsSource.credentialsAvailable.sendTo(this.credentialsAvailable)
        credentialsSource.credentialsInvalid.sendTo(this.credentialsInvalid)
    }

    storeUpdate(update) {
        const prefix = this.keyPrefix ? this.keyPrefix + '/' : ''
        const key = prefix + this.appId + '/' + this.dataSet + '/' + update.id
        this._storeInS3(key, JsonUtil.toStore(update))
            .then(() => this.updateStored.send(update))
            .then(() => console.log('Update stored', update.id))
            .catch(e => console.error('Failed after sending update', e))
    }

    requestUpdates() {
        this._getUpdates().then((updates) => this.incomingUpdates.send(updates))
    }

    _getUpdates() {
        const {s3, bucketName} = this
        if (!s3) return Promise.resolve([])

        function getUpdateKeys() {
            return s3.listObjectsV2({Bucket: bucketName}).promise().then(listData => listData.Contents.map(x => x.Key).filter( k => !k.endsWith("/")))
        }

        function getObjectBody(key) {
            return s3.getObject({Bucket: bucketName, Key: key}).promise()
                .then(data => {
                    const b = data.Body
                    try {
                        return JsonUtil.fromStore(b)
                    } catch (e) {
                        throw new Error(`${e.message} Key: ${key}  Body: ${b}`)
                    }
                })
        }

        function getObjectsForKeys(keys) {
            const promises = keys.map(getObjectBody)
            return Promise.all(promises)
        }

        return getUpdateKeys().then(getObjectsForKeys).catch(e => {
            console.error('S3UpdateStore: Error getting updates', e);
            return []
        })
    }

    _storeInS3(key, objectContent) {
        if (!this.s3) {
            return Promise.reject(new Error("Store not available"))
        }
        const params = {
            Bucket: this.bucketName,
            Key: key,
            Body: objectContent
        }

        return this.s3.putObject(params).promise().catch(e => console.warn('Failed to send update', e))
    }

    credentialsAvailable(credentials) {
        if (typeof credentials === "object") {
            AWS.config.credentials = credentials;
        }

        this.s3 = new AWS.S3()
        this.storeAvailable.value = true
        // console.log('S3UpdateStore Logged in.');
    }

    credentialsInvalid() {
        this.s3 = null
        this.storeAvailable.value = false
        // console.log('S3UpdateStore Logged out');

    }

}