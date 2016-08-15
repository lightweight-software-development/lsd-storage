const _ = require('lodash')
const {List, Record} = require('immutable');

const serializableClasses = [];

const ISO_DATETIME_REGEX = /\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d\.\d+([+-][0-2]\d:[0-5]\d|Z)/;

function defaultFromStoreJson(clazz) {
    return function(data) {
        const newObj = new clazz();
        if (newObj instanceof Record) {
            return newObj.merge(data);
        } else {
            return Object.assign(newObj, data);
        }
    }
}

function reviver(key, value) {
    if (typeof value === 'string' && ISO_DATETIME_REGEX.test(value)) {
        return new Date(value);
    }

    if (_.isArray(value) && key === 'postings') {
        return new List(value)
    }

    const type = value && value['@type'];
    if (type) {
        const clazz = serializableClasses.find( c => c.name == type);
        if (value.name && clazz[value.name]) {
            return clazz[value.name];
        }
        const data = Object.assign({}, value);
        delete data['@type'];
        const objectFunction = clazz.fromStoreJson || defaultFromStoreJson(clazz);
        return objectFunction(data);
    }

    return value;
}

module.exports = {
    registerClass(clazz) {
        serializableClasses.push(clazz);
    },

    toStore(obj){
        return JSON.stringify(obj);
    },

    fromStore(json) {
        return JSON.parse(json, reviver);
    },
    
    toInfo(obj) {

    }
};