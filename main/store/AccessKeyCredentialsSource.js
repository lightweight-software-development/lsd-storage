const {requireAWS} = require('../util/Util')
const AWS = requireAWS()
const {ObservableValue, ObservableEvent, bindFunctions} = require('lsd-observable')

class AccessKeyCredentialsSource {

    constructor(accessKey, secretKey) {
        this.credentialsAvailable = new ObservableValue()
        this.credentialsInvalid = new ObservableEvent()
        bindFunctions(this)
        if (accessKey && secretKey) {
            this.signIn(accessKey, secretKey)
        }
    }

    signIn(accessKey, secretKey) {
        AWS.config.update({accessKeyId: accessKey, secretAccessKey: secretKey})
        this.credentialsAvailable.value = true
    }

    signOut() {
        this.credentialsInvalid.send(true)
    }
}

module.exports = AccessKeyCredentialsSource