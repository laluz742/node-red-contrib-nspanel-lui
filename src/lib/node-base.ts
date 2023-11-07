import { INodeConfig, NodeAPI, StatusLevel } from '../types/types'
import { AbstractRedNode } from './abstract-node'
import { NSPanelNodeUtils } from './nspanel-node-utils'

export class NodeBase<TConfig extends INodeConfig, TCreds extends {} = {}> extends AbstractRedNode<TConfig, TCreds> {
    // eslint-disable-next-line @typescript-eslint/no-useless-constructor
    constructor(config: TConfig, RED: NodeAPI) {
        super(config, RED)
    }

    public setNodeStatus(statusLevel: StatusLevel, msg: string): void {
        const nodeRedStatus = NSPanelNodeUtils.createNodeStatus(statusLevel, msg)

        this.status(nodeRedStatus)
    }

    protected clearNodeStatus() {
        this.status({})
    }
}
