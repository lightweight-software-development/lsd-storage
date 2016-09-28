const {requireAWS} = require('../util/Util')
const AWS = requireAWS()
const {ObservableValue, ObservableEvent, bindFunctions} = require('lsd-observable')

class CognitoCredentialsSource {

    constructor(identityPoolId) {
        this.identityPoolId = identityPoolId
        this.credentialsAvailable = new ObservableValue()
        this.credentialsInvalid = new ObservableEvent()
        bindFunctions(this)
    }

    signIn(authResponse) {
        const credentials = new AWS.CognitoIdentityCredentials({
            IdentityPoolId: this.identityPoolId,
            Logins: {
                'accounts.google.com': authResponse.id_token
            }
        })
        credentials.userId = credentials.params.IdentityId
        this.credentialsAvailable.value = credentials
    }

    signOut() {
        this.credentialsInvalid.send(true)
    }
}

module.exports = CognitoCredentialsSource