import { PanelEntity } from './entities'
import { EventArgs, EventMapping } from './events'
import { PageEntityData } from './messages'
import { INodeConfig } from './nodered'

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

export type OnEventCallback = (eventArgs: EventArgs) => void
export type OnSensorDataCallback = (msg: any) => void

// #endregion callbacks
