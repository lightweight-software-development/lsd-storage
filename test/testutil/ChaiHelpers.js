let chai = require('chai'),
    chaiSubset = require('chai-subset')

chai.use(chaiSubset);

function jsEqual(chai, utils) {
    var Assertion = chai.Assertion;

    Assertion.addMethod('jsEql', function (expected) {
        new Assertion(this._obj.toJS()).to.eql(expected);
    });
}

function jsMatch(chai, utils) {
    var Assertion = chai.Assertion;

    Assertion.addMethod('jsMatch', function (expected) {
        new Assertion(this._obj.toJS()).to.containSubset(expected);
    });
}

module.exports = {jsEqual, jsMatch}