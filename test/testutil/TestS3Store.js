const {requireAWS} = require('../../main/util/Util')
const AWS = requireAWS()
const _ = require('lodash')
const JsonUtil = require('../../main/json/JsonUtil')
const S3UpdateStore = require('../../main/store/S3UpdateStore')

module.exports = class TestS3Store {
    //TODO pass in prefixes from test
    constructor(bucketName, outgoingPrefix, incomingPrefixes, appId, dataSet) {
        Object.assign(this, {bucketName, outgoingPrefix, incomingPrefixes, appId, dataSet})
        this.s3 = new AWS.S3()
    }

    getOutgoingUpdates() {
        const {s3, bucketName, appId, dataSet, outgoingPrefix} = this

        function getUpdateKeys() { // TODO use getKeys
            const prefix = `${appId}/${dataSet}/${outgoingPrefix}`
            return s3.listObjectsV2({Bucket: bucketName, Prefix: prefix}).promise().then(listData => listData.Contents.map(x => x.Key).filter( k => !k.endsWith("/")))
        }

        function getObjectBody(key) {
            return s3.getObject({Bucket: bucketName, Key: key}).promise().then(data => data.Body)
        }

        function getObjectsForKeys(keys) {
            const promises = keys.map(getObjectBody)
            return Promise.all(promises)
        }

        function asUpdates(objectBodies) {
            return objectBodies.map(b => JsonUtil.fromStore(b))
        }

        return getUpdateKeys().then(getObjectsForKeys).then(asUpdates).catch(e => {
            console.error('TestS3Store: Error getting updates', e);
            return []
        })
    }

    getKeys(folderInDataSet) {
        const {s3, bucketName, appId, dataSet} = this
        const prefix = `${appId}/${dataSet}/${folderInDataSet}`
        return s3.listObjectsV2({Bucket: bucketName, Prefix: prefix}).promise().then(listData => listData.Contents.map(x => x.Key).filter( k => !k.endsWith("/")))
    }

    clearBucket() {
        const {s3, bucketName} = this

        function getUpdateKeys() {
            return s3.listObjectsV2({Bucket: bucketName}).promise().then(listData => listData.Contents.map(x => x.Key))
        }

        function deleteObjectsForKeys(keys) {
            if (!keys.length) {
                // console.log("TestS3Store: Bucket empty nothing to delete")
                return
            }
            const keysToDelete = keys.map(k => ({Key: k}))

            const params = {
                Bucket: bucketName,
                Delete: {
                    Objects: keysToDelete,
                }
            };
            return s3.deleteObjects(params).promise()
        }

        return getUpdateKeys().then(deleteObjectsForKeys).catch(e => {
            console.error('TestS3Store: Error clearing updates', e);
            return []
        })
    }

    storeIncomingUpdate(updatesAreaIndex, update) {
        const content = JsonUtil.toStore(update)
        const bucketKey = S3UpdateStore.bucketKey(update.id)
        return this._storeInS3(this._folderKey(updatesAreaIndex) + bucketKey, content)
            .then( () => this._storeInS3(this._otherFolderKey(updatesAreaIndex) + bucketKey, content))
            .catch(e => console.error('Failed after sending update', e))
    }

    setupIncomingUpdates(updates1, updates2) {
        const folderPromise1 = this._storeInS3(this._folderKey(0), '')
        const folderPromise2 = this._storeInS3(this._folderKey(1), '')
        const otherFolderPromise1 = this._storeInS3(this._otherFolderKey(0), '')
        const otherFolderPromise2 = this._storeInS3(this._otherFolderKey(1), '')
        const promises1 = updates1.map(u => this.storeIncomingUpdate(0, u)).concat(folderPromise1, otherFolderPromise1)
        const promises2 = updates2.map(u => this.storeIncomingUpdate(1, u)).concat(folderPromise2, otherFolderPromise2)
        return Promise.all(promises1.concat(promises2))
    }

    _folderKey(updatesAreaIndex) {
        return `${this.appId}/${this.dataSet}/${this.incomingPrefixes[updatesAreaIndex]}/`
    }

    _otherFolderKey(updatesAreaIndex) {
        return `${this.appId}/${this.dataSet}/${this.incomingPrefixes[updatesAreaIndex]}_other/`
    }

    _storeInS3(key, objectContent) {
        const params = {
            Bucket: this.bucketName,
            Key: key,
            Body: objectContent
        }

        return this.s3.putObject(params).promise()
    }


}