const {ObservableEvent, bindFunctions} = require('lsd-observable')

class UpdateScheduler {
    constructor(pollIntervalSeconds, timeoutSeconds, delayBeforeStartMillis = 10) {
        this.pollInterval = pollIntervalSeconds * 1000
        this.timeout = timeoutSeconds * 1000
        this.lastActivity = Date.now()
        this.lastCheck = 0
        this.isInUse = true
        this.updateRequired = new ObservableEvent()
        bindFunctions(this)
        setTimeout( this._scheduleCheck.bind(this), delayBeforeStartMillis)
    }

    uiEventReceived() {
        this.lastActivity = Date.now()
        this.checkIfUpdateRequired()
    }

    windowInUse(isInUse) {
        this.isInUse = isInUse
        if (isInUse) {
            this.lastActivity = Date.now()
            this.checkIfUpdateRequired()
        }

    }

    checkIfUpdateRequired() {
        // console.log('checkIfUpdateRequired', Date.now())
        const timeSinceCheck = Date.now() - this.lastCheck
        const timeSinceActivity = Date.now() - this.lastActivity
        if (this.isInUse && timeSinceCheck >= this.pollInterval && timeSinceActivity < this.timeout) {
            this.updateRequired.send(true)
            this.lastCheck = Date.now()
            this._scheduleCheck()
        }
    }

    _scheduleCheck() {
        // console.log('_scheduleCheck', Date.now())
        if (this._timer) return

        this._timer = setTimeout( () => {
            this._timer = null
            this.checkIfUpdateRequired()
        }, this.pollInterval)
    }
}

module.exports = UpdateScheduler