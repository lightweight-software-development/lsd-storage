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

function waitForPromise(condition, timeout = 10000) {
    return waitFor(condition, timeout)
    // const startTime = Date.now()
    // return new Promise(function(resolve, reject) {
    //     function testCondition() {
    //         condition().then( result => {
    //             if (result) {
    //                 resolve(result)
    //             } else if (Date.now() - startTime > timeout) {
    //                 reject( new Error("Timeout waiting for " + condition.toString()))
    //             } else {
    //                 setTimeout(testCondition, 100)
    //             }
    //         })
    //     }
    //
    //     testCondition()
    // })
}



module.exports = {capture, captureFlat, waitFor, waitForPromise}