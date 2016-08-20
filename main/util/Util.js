module.exports = {
    requireAWS: function () {
        if (typeof window === "object") {
            require('aws-sdk/dist/aws-sdk')
            return window.AWS
        } else {
            return require('aws-sdk')
        }

    }
}