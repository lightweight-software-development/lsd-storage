require('aws-sdk/dist/aws-sdk')
const root = (typeof self === 'object' && self.self === self && self) ||
    (typeof global === 'object' && global.global === global && global) ||
    this

const AWS = root.AWS
const ObservableData = require('lsd-events').ObservableData


module.exports = class S3UpdateStore {

    constructor(bucketName, keyPrefix, appId, dataSet, credentialsSource) {
        Object.assign(this, {bucketName, keyPrefix, appId, dataSet})
        credentialsSource.credentialsAvailable.sendTo( this.credentialsAvailable.bind(this) )

        this.updateStored = new ObservableData()
        this.storeAvailable = new ObservableData(false)

        this.storeUpdate = this.storeUpdate.bind(this)
        AWS.config.region = 'eu-west-1'
    }

    storeUpdate(update) {
        const prefix = this.keyPrefix ? this.keyPrefix + '/' : ''
        const key = prefix + this.appId + '/' + this.dataSet + '/' + update.id
        this._storeInS3(key, JSON.stringify(update))
            .then( () => this.updateStored.set(update) )
            .then( () => console.log('Update stored', update.id))
            .catch( e => console.error('Failed after sending update', e) )
    }

    getUpdates() {
        const {s3, bucketName} = this
        if (!s3) return Promise.resolve([])

        function getUpdateKeys() {
            return s3.listObjectsV2({ Bucket: bucketName }).promise().then( listData => listData.Contents.map( x => x.Key ))
        }

        function getObjectBody(key) {
            return s3.getObjectBody({Key: key}).promise().then( data => data.Body )
        }

        function getObjectsForKeys(keys) {
            const promises = keys.map( getObjectBody )
            return Promise.all(promises)
        }

        function asUpdates(objectBodies) {
            return objectBodies.map( b => JSON.parse(b) )
        }

        return getUpdateKeys().then( getObjectsForKeys ).then( asUpdates ).catch( e => {console.error('Error getting updates', e); return []} )
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

        return this.s3.putObject(params).promise().catch( e => console.warn('Failed to send update', e) )
    }

    credentialsAvailable(credentials) {
        AWS.config.credentials = credentials;

        this.s3 = new AWS.S3()
        this.storeAvailable.set(true)
        console.log('Logged in.');
    }

}