const {ObservableValue, ObservableEvent, bindFunctions} = require('lsd-observable')

class BuiltinCredentialsSource {

    constructor() {
        this.credentialsAvailable = new ObservableValue()
        this.credentialsInvalid = new ObservableEvent()
        bindFunctions(this)
        this.signIn()
    }

    signIn() {
        this.credentialsAvailable.value = true
    }

    signOut() {
        this.credentialsInvalid.send(true)
    }
}

module.exports = BuiltinCredentialsSource