import * as nodeRed from 'node-red'
import { NodeAPI as NodeRedNodeAPI } from 'node-red'

export interface NodeAPI extends NodeRedNodeAPI {}
export interface NodeMessage extends nodeRed.NodeMessage {}
export interface NodeMessageInFlow extends nodeRed.NodeMessageInFlow {}
export interface NodeMessageParts extends nodeRed.NodeMessageParts {}

export type VoidCallback = () => void
export type NodeRedOnErrorCallback = (err?: Error) => void
export type NodeRedSendCallback = (msg: NodeMessage | (NodeMessage | NodeMessage[])[]) => void
export type NodeRedOnInputCallback = (
    msg: NodeMessageInFlow,
    send: NodeRedSendCallback,
    done: NodeRedOnErrorCallback
) => void

export type NodeRedI18nResolver = (key: string) => string

export interface IRedNodeDef extends nodeRed.NodeDef {}
export interface INodeConfig extends IRedNodeDef {}
export interface IRedNode<TCreds extends {} = {}> extends nodeRed.Node<TCreds> {}
