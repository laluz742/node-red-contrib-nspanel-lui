'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
exports.AbstractRedNode = void 0

class AbstractRedNode {
    constructor(config, RED) {
        RED.nodes.createNode(this, config)
        this.RED = RED
    }
}

exports.AbstractRedNode = AbstractRedNode
