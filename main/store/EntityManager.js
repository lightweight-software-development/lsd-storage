const uuid = require('node-uuid')

module.exports = class EntityManager {

    constructor(appStore, entityType) {
        this.appStore = appStore
        this.entityType = entityType
        this.typeName = entityType.name
        this.typeLowerCase = this.typeName.toLowerCase()
    }
    get(id) { return this.appStore.state.value[this.typeLowerCase](id) }

    choiceList() { throw new Error("Must override")}

    newInstance() {
        return new this.entityType();
    }

    save(entity) {
        const entityWithId = entity.id ? entity : entity.merge({id: uuid.v4()})
        const setFunction = "set" + this.typeName
        this.appStore.updateAndSave(setFunction, entityWithId)
        return entityWithId
    }

}