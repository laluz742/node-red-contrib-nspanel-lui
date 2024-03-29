import * as nodeRed from 'node-red' // eslint-disable-line

export interface NodeAPI extends nodeRed.NodeAPI {}
export type NodeMessage = nodeRed.NodeMessage & {}
export type NodeMessageInFlow = nodeRed.NodeMessageInFlow & {}
export type NodeMessageParts = nodeRed.NodeMessageParts & {}

export type VoidCallback = () => void
export type NodeRedOnErrorCallback = (err?: Error) => void
export type NodeRedSendCallback = (msg: NodeMessage | (NodeMessage | NodeMessage[])[]) => void
export type NodeRedOnInputCallback = (
    msg: NodeMessageInFlow,
    send: NodeRedSendCallback,
    done: NodeRedOnErrorCallback
) => void

export type NodeRedI18nResolver = (key: string) => string

export interface INodeRedNodeDef extends nodeRed.NodeDef {}
export interface INodeConfig extends INodeRedNodeDef {}
export interface IRedNode<TCreds extends {} = {}> extends nodeRed.Node<TCreds> {}

export type NodeStatusFill = nodeRed.NodeStatusFill
export type NodeRedStatus = nodeRed.NodeStatus
