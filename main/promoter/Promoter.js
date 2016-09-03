const AWS = require('aws-sdk')
const LocalUpdateStore = require('../store/LocalUpdateStore')
const S3UpdateStore = require('../store/S3UpdateStore')
const StateController = require('../store/StateController')
const PersistentStore = require('../store/PersistentStore')
const JsonUtil = require('../json/JsonUtil')
const BuiltinCredentialsSource = require('../store/BuiltinCredentialsSource')
const {defaultSharedAreaPrefix} = S3UpdateStore

class Promoter {

    static createLambdaHandler(dataBucketNameSuffix, model, appName, dataSet) {
        const appConfig = {appName, dataSet}
        let promoter

        function getPromoter(context) {
            const functionNameRegex = new RegExp(`^${appName}_(.+)_.+`)
            let env = functionNameRegex.exec(context.functionName)[1];

            const bucketName = `${appName}-${env}-${dataBucketNameSuffix}`
            return promoter || (promoter = new Promoter(bucketName, model, appConfig))
        }

        return function (event, context, callback) {
            const key = decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, " "))
            const promoter = getPromoter(context)
            promoter.promote(key).then( () => callback(null, key) ).catch( e => callback(e) )
        }
    }

    constructor(bucketName, model, appConfig, credentialsSource = new BuiltinCredentialsSource()) {
        this.bucketName = bucketName
        this.stateController = new StateController(model)

        const localStore = new LocalUpdateStore()
        const remoteStore = new S3UpdateStore(bucketName, defaultSharedAreaPrefix, defaultSharedAreaPrefix, appConfig.appName, appConfig.dataSet, credentialsSource)

        this.persistentStore = new PersistentStore(localStore, remoteStore)

        this.persistentStore.externalUpdate.sendTo(this.stateController.applyUpdate)
        this.stateController.newUpdate.sendTo(this.persistentStore.dispatchUpdate)

        this.persistentStore.init()

        this.s3 = new AWS.S3()
    }

    promote(key) {
        console.log(`Promoting ${this.bucketName}/${key}`)
        return this.s3.getObject({Bucket: this.bucketName, Key: key}).promise()
            .then(data => {
                const body = data.Body
                try {
                    const update = JsonUtil.fromStore(body)
                    this.stateController.updateFromClient(update)
                    console.log(`Applied update ${this.bucketName}/${key}`)
                } catch (e) {
                    console.error(`Failed to promote ${this.bucketName}/${key}`, e)
                    throw new Error(`${e.message} Key: ${key}  Body: ${body}`)
                }
            }, e => {console.error("Could not get update to promote", e); throw e})
    }
}

module.exports = Promoter