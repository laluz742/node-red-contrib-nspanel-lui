import {
    EventArgs,
    EventMapping,
    INodeConfig,
    IPanelNode,
    NodeRedOnErrorCallback,
    NodeRedSendCallback,
    PageEntityData,
    PageInputMessage,
    PanelEntity,
} from '.'

export type PageId = string
export type ConfiguredEventsMap = Map<string, EventMapping>
export type PageCache = string | string[] | null

export type PanelBasedConfig = INodeConfig & {
    nsPanel: string
}

export type IPageConfig = PanelBasedConfig & {
    timeout: number | string
    title: string | undefined

    events: EventMapping[]
}

export interface IEntityBasedPageConfig extends IPageConfig {
    entities: PanelEntity[]
}

export declare interface IPageOptions {
    pageType: string
    maxEntities?: number
}

export interface IPageNode extends INodeConfig {
    getPageType(): string
    generatePage(): string | string[]
    generatePopupDetails(type: string, entityId: string): string | string[]
    isScreenSaver(): boolean
    setActive(state: boolean): void
    getPanel(): IPanelNode
    getTimeout(): number | null

    emit(event: string | symbol, ...args: any[]): boolean
    on(event: 'page:update', callback: PageEventCallbackType): void
    on(event: 'nav:pageId', listener: PageIdEventCallbackType): void
    on(event: 'nav:page', listener: PageIdEventCallbackType): void
    on(event: 'input', listener: PageOnInputCallback): void
}
export declare interface PageData {
    entities: PageEntityData[]
}

// #region callbacks

export type PageOnInputCallback = (
    msg: PageInputMessage,
    send: NodeRedSendCallback,
    done: NodeRedOnErrorCallback
) => void

export type PageEventCallbackType = (page: IPageNode) => void
export type PageIdEventCallbackType = (pageId: PageId) => void
export type OnEventCallback = (eventArgs: EventArgs) => void
export type OnSensorDataCallback = (msg: any) => void

// #endregion callbacks
