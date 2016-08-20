module.exports = {
    CognitoCredentialsSource: require('./store/CognitoCredentialsSource'),
    LocalStorageUpdateStore: require('./store/LocalStorageUpdateStore'),
    PersistentStore: require('./store/PersistentStore'),
    PersistentStoreController: require('./store/PersistentStoreController'),
    S3UpdateStore: require('./store/S3UpdateStore'),
    SynchronizingStore: require('./store/SynchronizingStore'),
    EntityManager: require('./util/EntityManager'),
    JsonUtil: require('./json/JsonUtil'),
}