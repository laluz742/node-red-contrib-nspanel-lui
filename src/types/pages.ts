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

export type PageConfig = PanelBasedConfig & {
    timeout: number | string
    title: string | undefined

    events: EventMapping[]
}

export type EntityBasedPageConfig = PageConfig & {
    entities: PanelEntity[]
}

export type PageOptions = {
    pageType: string
    maxEntities: number
}

export declare type PageData = {
    entities: PageEntityData[]
}

// #region callbacks

export type OnEventCallback = (eventArgs: EventArgs) => void
export type OnSensorDataCallback = (msg: any) => void

// #endregion callbacks
