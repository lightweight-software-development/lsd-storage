const {ObservableValue, ObservableEvent, bindFunctions} = require('lsd-observable')

class StateController {

    constructor(initialState) {
        this.state = new ObservableValue(initialState)
        this.newUpdate = new ObservableEvent()

        bindFunctions(this)
    }

    get appState() {
        return this.state.value
    }

    update(methodName, ...args) {
        if (args.length > 1) {
            throw new Error("Cannot handle multiple arguments yet: " + args)        // TODO  handle multiple arguments
        }
        this.newUpdate.send({actions: [{type: methodName, data: args[0]}] })
    }

    updateFromClient(update) {
        this.newUpdate.send(update)
    }

    applySnapshot() {
    }

    applyUpdate(update) {
        console.log("StateController: applyUpdate starting")
        let state = this.state.value

        function applyAction(methodName, args) {
            const updateFunction = state[methodName]
            if (typeof updateFunction !== 'function')  {
                console.error( `Method ${methodName} not found on ${state}`)
                return
            }
            state = updateFunction.apply(state, args)
        }

        try {
            update.actions.forEach(a => {
                applyAction(a.type, [a.data])
            })
            if (state !== this.state.value) {
                this.state.value = state
            }
            console.log("StateController: applyUpdate done")
        } catch (e) {
            console.error(`Could not do update ${update.id}: ${e.message}`)
        }
    }
}

module.exports = StateController
