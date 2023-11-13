import { PanelEntity } from './entities'
import { EventArgs, EventMapping } from './events'
import { HMICommand } from './hmi'
import { PageEntityData } from './messages'
import { INodeConfig } from './nodered'

export type ConfiguredEventsMap = Map<string, EventMapping>

export interface IPageCache {
    get(): HMICommand | HMICommand[] | null
    put(data: HMICommand | HMICommand[] | null): void
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
    forceRedraw?: boolean
}

export type PageData = {
    entities: PageEntityData[]
}

export type ScreenSaverBaseConfig = PageConfig & {
    doubleTapToExit: boolean
}

// #region callbacks
export type OnEventCallback = (eventArgs: EventArgs) => void
export type OnSensorDataCallback = (msg: any) => void
// #endregion callbacks
