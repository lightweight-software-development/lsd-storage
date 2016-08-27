module.exports = {
    requireAWS: function () {
        if (typeof window === "object") {
            return window.AWS
        } else {
            return require('aws-sdk')
        }

    }
}