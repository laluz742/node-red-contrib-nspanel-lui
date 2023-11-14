import { PageId, StatusLevel } from './base'
import { HMICommand } from './commands'
import { PageInputMessage } from './messages'
import { INodeConfig, NodeRedOnErrorCallback, NodeRedSendCallback } from './nodered'

export interface IPanelNode extends INodeConfig {
    registerPage(pageNode: IPageNode): void
    deregisterPage(pageNode: IPageNode): void
}

export type PageOnInputCallback = (
    msg: PageInputMessage,
    send: NodeRedSendCallback,
    done: NodeRedOnErrorCallback
) => void

export type PageEventCallbackType = (page: IPageNode) => void
export type PageSendEventCallbackType = (page: IPageNode, data: HMICommand | HMICommand[]) => void
export type PageIdEventCallbackType = (pageId: PageId) => void

// FIXME: hierarchy mismatch
export interface IPageNode extends INodeConfig {
    getPageType(): string
    generatePage(): HMICommand | HMICommand[] | null
    generatePopupDetails(type: string, entityId: string): HMICommand | HMICommand[] | null
    isScreenSaver(): boolean
    isForceRedraw(): boolean
    setActive(state: boolean): void
    getPanel(): IPanelNode | null
    getTimeout(): number | null

    setNodeStatus(statusLevel: StatusLevel, msg: string): void

    emit(event: string | symbol, ...args: any[]): boolean
    on(event: 'page:update', callback: PageEventCallbackType): void
    on(event: 'page:send', callback: PageSendEventCallbackType): void
    on(event: 'nav:pageId', listener: PageIdEventCallbackType): void
    on(event: 'nav:page', listener: PageIdEventCallbackType): void
    on(event: 'input', listener: PageOnInputCallback): void
}

export interface EntitiesPageNode extends IPageNode {}

export type NodeStatus = {
    statusLevel: StatusLevel
    msg: string
}

export type InputHandlingResult = {
    handled: boolean
    requestUpdate?: boolean
}
