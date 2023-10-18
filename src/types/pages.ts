import { PanelEntity } from './entities'
import { EventArgs, EventMapping } from './events'
import { PageEntityData, PageInputMessage } from './messages'
import { INodeConfig, NodeRedOnErrorCallback, NodeRedSendCallback } from './nodered'
import { IPageNode } from './nodes'

export type PageId = string
export type ConfiguredEventsMap = Map<string, EventMapping>

export interface IPageCache {
    get(): string | string[] | null
    put(data: string | string[] | null): void
    containsData(): boolean
    clear()
}

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
    maxEntities: number
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
