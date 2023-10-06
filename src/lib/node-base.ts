import { INodeConfig, NodeAPI } from '../types'
import { AbstractRedNode } from './abstract-node'

export class NodeBase<TConfig extends INodeConfig, TCreds extends {} = {}> extends AbstractRedNode<TConfig, TCreds> {
    constructor(config: TConfig, RED: NodeAPI) {
        super(config, RED)
    }
}
