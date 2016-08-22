const {ObservableValue, ObservableEvent, bindFunctions} = require('lsd-observable')

class StateController {

    constructor(initialState) {
        this.state = new ObservableValue(initialState)
        this.newAction = new ObservableEvent()

        bindFunctions(this)
    }

    get appState() {
        return this.state.value
    }

    update(methodName, ...args) {
        // this._updateState(methodName, args)
        if (args.length > 1) {
            throw new Error("Cannot handle multiple arguments yet: " + args)        // TODO  handle multiple arguments
        }
        this.newAction.send({type: methodName, data: args[0]})
    }

    _updateState(methodName, args) {
        const currentState = this.state.value
        const updateFunction = currentState[methodName]
        if (typeof updateFunction !== 'function')  {
            console.error( `Method ${methodName} not found on ${currentState}`)
            return
        }
        this.state.value = updateFunction.apply(currentState, args)
    }

    applySnapshot() {
    }

    applyAction(action) {
        this._updateState(action.type, [action.data])
    }

}

module.exports = StateController
