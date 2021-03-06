module.exports = {
    AccessKeyCredentialsSource: require('./store/AccessKeyCredentialsSource'),
    BuiltinCredentialsSource: require('./store/BuiltinCredentialsSource'),
    CognitoCredentialsSource: require('./store/CognitoCredentialsSource'),
    LocalStorageUpdateStore: require('./store/LocalStorageUpdateStore'),
    LocalUpdateStore: require('./store/LocalUpdateStore'),
    PersistentStore: require('./store/PersistentStore'),
    PersistentStoreController: require('./store/PersistentStoreController'),
    S3UpdateStore: require('./store/S3UpdateStore'),
    StateController: require('./store/StateController'),
    UpdateScheduler: require('./store/UpdateScheduler'),
    EntityManager: require('./util/EntityManager'),
    JsonUtil: require('./json/JsonUtil'),
    Promoter: require('./promoter/Promoter'),
}