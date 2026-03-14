class Crud {
    constructor() {
        if (new.target === Crud) {
            throw new Error("Crud is abstract — cannot instantiate directly!")
        }
    }

    create() {
        throw new Error("create() must be implemented!")
    }

    get() {
        throw new Error("get() must be implemented!")
    }

    update() {
        throw new Error("update() must be implemented!")
    }

    delete() {
        throw new Error("delete() must be implemented!")
    }
}

module.exports = Crud;