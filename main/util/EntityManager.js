const uuid = require('node-uuid')

module.exports = class EntityManager {

    constructor(appStore, entityType, saveFunction) {
        this.appStore = appStore
        this.entityType = entityType
        this.typeName = entityType.name
        this.typeLowerCase = this.typeName.toLowerCase()
        this.saveFunction = saveFunction || `set${this.typeName}`
    }
    get(id) { return this.appStore.state.value[this.typeLowerCase](id) }

    choiceList() { throw new Error("Must override")}

    newInstance() {
        return new this.entityType();
    }

    save(entity) {
        const entityWithId = entity.id ? entity : entity.merge({id: uuid.v4()})
        this.appStore.update(this.saveFunction, entityWithId)
        return entityWithId
    }

}