const {JsonUtil} = require('../../main/index')

class TestItem {
    constructor(id, name, index) {
        this.id = id
        this.name = name
        this.index = index
    }

    toJSON() {
        return {"@type": this.constructor.name, id: this.id, name: this.name, index: this.index}
    }

}

JsonUtil.registerClass(TestItem)

module.exports = TestItem