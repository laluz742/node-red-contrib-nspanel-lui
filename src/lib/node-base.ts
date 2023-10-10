import { INodeConfig, NodeAPI, NodeStatusFill, StatusLevel } from '../types'
import { AbstractRedNode } from './abstract-node'

export class NodeBase<TConfig extends INodeConfig, TCreds extends {} = {}> extends AbstractRedNode<TConfig, TCreds> {
    constructor(config: TConfig, RED: NodeAPI) {
        super(config, RED)
    }

    protected setNodeStatus(statusLevel: StatusLevel, msg: string): void {
        var statusFill: NodeStatusFill

        switch (statusLevel) {
            case 'error':
                statusFill = 'red'
                break
            case 'warn':
                statusFill = 'yellow'
                break
            case 'info':
                statusFill = 'blue'
                break
            case 'success':
                statusFill = 'green'
                break
            default:
                statusFill = 'grey'
        }

        this.status({ fill: statusFill, shape: 'dot', text: msg })
    }

    protected clearNodeStatus() {
        this.status({})
    }
}
