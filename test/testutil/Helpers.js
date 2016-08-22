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
        function testCondition() {
            const result = condition()
            if (result) {
                resolve(result)
            } else if (Date.now() - startTime > timeout) {
                reject( new Error("Timeout waiting for " + condition.toString()))
            } else {
                setTimeout(testCondition, 100)
            }
        }

        testCondition()
    })
}



module.exports = {capture, captureFlat, waitFor}