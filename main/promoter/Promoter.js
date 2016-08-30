function requireAWS() {
    if (typeof window === "object") {
        return window.AWS
    } else {
        return require('aws-sdk')
    }
}

const AWS = requireAWS()
const LocalUpdateStore = require('../../main/store/LocalUpdateStore')
const S3UpdateStore = require('../../main/store/S3UpdateStore')
const StateController = require('../../main/store/StateController')
const PersistentStore = require('../../main/store/PersistentStore')
const JsonUtil = require('../../main/json/JsonUtil')
const BuiltinCredentialsSource = require('../../main/store/BuiltinCredentialsSource')

class Promoter {

    constructor(bucketName, model, appConfig, credentialsSource = new BuiltinCredentialsSource()) {
        this.bucketName = bucketName
        this.stateController = new StateController(model)

        const localStore = new LocalUpdateStore()
        const remoteStore = new S3UpdateStore(bucketName, 'updates', 'updates', appConfig.appName, appConfig.dataSet, credentialsSource)

        this.persistentStore = new PersistentStore(localStore, remoteStore)

        this.persistentStore.externalUpdate.sendTo(this.stateController.applyAction)
        this.stateController.newAction.sendTo(this.persistentStore.dispatchUpdate)

        this.persistentStore.init()

        this.s3 = new AWS.S3()

    }

    promote(key) {
        this.s3.getObject({Bucket: this.bucketName, Key: key}).promise()
            .then(data => {
                const body = data.Body
                try {
                    const update = JsonUtil.fromStore(body)
                    update.unsavedUpdates.forEach( (action, index) => {
                        try {
                            this.stateController.update(action.type, action.data)
                        } catch (e) {
                            console.error(`${e.message} Update Key: ${key}  Action index: ${index} Update Body: ${body}`)
                        }
                    })


                } catch (e) {
                    throw new Error(`${e.message} Key: ${key}  Body: ${body}`)
                }
            })
    }
}

module.exports = Promoter