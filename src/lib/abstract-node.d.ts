import * as nodeRed from 'node-red'
import { INodeConfig, IRedNodeDef, IRedNode, VoidCallback, NodeRedOnInputCallback } from '../types/types'

export declare abstract class AbstractRedNode<TConfig extends INodeConfig, TCreds extends {} = {}>
    implements IRedNode<TCreds>
{
    RED: nodeRed.NodeAPI

    id: string

    type: string

    z: string

    name: string

    credentials: TCreds

    emit(event: string | symbol, ...args: any[]): boolean
    on(event: string, listener: Function): void
    on(event: 'close', listener: (done: () => void) => void)

    done(msg: any): void
    send(msg: any): void

    status(status: nodeRed.NodeStatus): void

    log(msg: any): void
    debug(msg: any): void
    error(logMessage: any, msg?: any): void
    error(err: string, msg: any): void
    error(err: string): void
    warn(msg: any): void
    trace(msg: any): void

    constructor(config: TConfig, RED: nodeRed.NodeAPI)
}
