import { PageId, StatusLevel } from './base'
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
export type PageIdEventCallbackType = (pageId: PageId) => void

export interface IPageNode extends INodeConfig {
    getPageType(): string
    generatePage(): string | string[] | null
    generatePopupDetails(type: string, entityId: string): string | string[] | null
    isScreenSaver(): boolean
    setActive(state: boolean): void
    getPanel(): IPanelNode | null
    getTimeout(): number | null

    emit(event: string | symbol, ...args: any[]): boolean
    on(event: 'page:update', callback: PageEventCallbackType): void
    on(event: 'nav:pageId', listener: PageIdEventCallbackType): void
    on(event: 'nav:page', listener: PageIdEventCallbackType): void
    on(event: 'input', listener: PageOnInputCallback): void
}

export interface EntitiesPageNode extends IPageNode {}

export type NodeStatus = {
    statusLevel: StatusLevel
    msg: string
}