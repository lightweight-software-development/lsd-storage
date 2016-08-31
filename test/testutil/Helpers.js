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

function waitFor(condition, timeout = 5000) {
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

function waitForData(getData, condition, timeout = 5000) {
    const startTime = Date.now()
    return new Promise(function(resolve, reject) {
        let latestData = "NO DATA"

        function handleResult(result) {
            if (!!result) {
                resolve(latestData)
            } else if (Date.now() - startTime > timeout) {
                reject(new Error(`Timeout waiting for ${getData.toString()} to have ${condition.toString()} data: [${typeof latestData}] ${String(latestData)}` ))
            } else {
                setTimeout(testCondition, 100)
            }
        }

        function testCondition() {
            const data = getData()
            if (data instanceof Promise) {
                data.then( d => {
                    latestData = d
                    return condition(d)
                }).then(handleResult)
            } else {
                latestData = data
                handleResult(condition(data))
            }
        }

        testCondition()
    })
}

function waitForWithError(condition, timeout = 5000) {
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

module.exports = {capture, captureFlat, waitFor, waitForWithError, waitForData}