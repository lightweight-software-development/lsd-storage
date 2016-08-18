const ObservableData = require('lsd-observable').ObservableData

class CognitoCredentialsSource {

    constructor(identityPoolId) {
        this.identityPoolId = identityPoolId
        this.credentialsAvailable = new ObservableData()
        this.credentialsInvalid = new ObservableData()
        this.signIn = this.signIn.bind(this)
        this.signOut = this.signIn.bind(this)
    }

    signIn(authResponse) {
        this.credentialsAvailable.value = new AWS.CognitoIdentityCredentials({
            IdentityPoolId: this.identityPoolId,
            Logins: {
                'accounts.google.com': authResponse.id_token
            }
        })
    }

    signOut() {
        this.credentialsInvalid.value = true
    }
}

module.exports = CognitoCredentialsSource