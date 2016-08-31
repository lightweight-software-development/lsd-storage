function requireAWS() {
    if (typeof window === "object") {
        return window.AWS
    } else {
        return require('aws-sdk')
    }
}

const AWS = requireAWS()
const LocalUpdateStore = require('../store/LocalUpdateStore')
const S3UpdateStore = require('../store/S3UpdateStore')
const StateController = require('../store/StateController')
const PersistentStore = require('../store/PersistentStore')
const JsonUtil = require('../json/JsonUtil')
const BuiltinCredentialsSource = require('../store/BuiltinCredentialsSource')

class Promoter {

    constructor(bucketName, model, appConfig, credentialsSource = new BuiltinCredentialsSource()) {
        this.bucketName = bucketName
        this.stateController = new StateController(model)

        const localStore = new LocalUpdateStore()
        const remoteStore = new S3UpdateStore(bucketName, 'shared', 'shared', appConfig.appName, appConfig.dataSet, credentialsSource)

        this.persistentStore = new PersistentStore(localStore, remoteStore)

        this.persistentStore.externalUpdate.sendTo(this.stateController.applyUpdate)
        this.stateController.newUpdate.sendTo(this.persistentStore.dispatchUpdate)

        this.persistentStore.init()

        this.s3 = new AWS.S3()

    }

    promote(key) {
        this.s3.getObject({Bucket: this.bucketName, Key: key}).promise()
            .then(data => {
                const body = data.Body
                try {
                    const update = JsonUtil.fromStore(body)
                    this.stateController.updateFromClient(update)
                } catch (e) {
                    throw new Error(`${e.message} Key: ${key}  Body: ${body}`)
                }
            })
    }
}

module.exports = Promoter