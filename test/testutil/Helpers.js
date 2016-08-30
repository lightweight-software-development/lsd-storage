function capture(eventSource) {
    const events = []
    eventSource.sendTo(x => events.push(x))
    return events
}

function captureFlat(eventSource) {
    const events = []
    eventSource.sendFlatTo(x => events.push(x))
    return events
}

function waitFor(condition, timeout = 10000) {
    const startTime = Date.now()
    return new Promise(function(resolve, reject) {
        function handleResult(result) {
            if (result) {
                resolve(result)
            } else if (Date.now() - startTime > timeout) {
                reject(new Error("Timeout waiting for " + condition.toString()))
            } else {
                setTimeout(testCondition, 100)
            }
        }

        function testCondition() {
            const result = condition()
            if (result instanceof Promise) {
                result.then(handleResult)
            } else {
                handleResult(result)
            }
        }

        testCondition()
    })
}

function waitForError(condition, timeout = 10000) {
    const startTime = Date.now()
    return new Promise(function(resolve, reject) {
        function handleResult(result) {
            if (!!result) {
                resolve(result)
            } else if (Date.now() - startTime > timeout) {
                reject(new Error("Timeout waiting for " + condition.toString()))
            } else {
                setTimeout(testCondition, 100)
            }
        }

        function handleError(err) {
            if (Date.now() - startTime > timeout) {
                reject(err)
            } else {
                setTimeout(testCondition, 100)
            }
        }

        function testCondition() {
            let result
            try {
                result = condition()
                if (result instanceof Promise) {
                    result.then(handleResult).catch(handleError)
                } else {
                    handleResult(result)
                }
            } catch(e) {
                handleError(e)
            }
        }

        testCondition()
    })
}

module.exports = {capture, captureFlat, waitFor, waitForError}