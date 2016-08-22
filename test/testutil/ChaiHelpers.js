let chai = require('chai'),
    chaiSubset = require('chai-subset')

chai.use(chaiSubset);

function jsEqual(chai, utils) {
    var Assertion = chai.Assertion;

    Assertion.addMethod('jsEql', function (expected) {
        const value = this._obj.toJS ? this._obj.toJS() : this._obj
        new Assertion(value).to.eql(expected);
    });
}

function jsMatch(chai, utils) {
    var Assertion = chai.Assertion;

    Assertion.addMethod('jsMatch', function (expected) {
        const value = this._obj.toJS ? this._obj.toJS() : this._obj
        new Assertion(value).to.containSubset(expected);
    });
}

module.exports = {jsEqual, jsMatch}