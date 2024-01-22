import { PanelEntity } from './entities'
import { EventArgs, EventMapping } from './events'
import { HMICommand } from './commands'
import { NotifyData, PageEntityData } from './messages'
import { INodeConfig } from './nodered'
import { IStatus, PageId } from './base'
import { IPageHistory } from './controller'
import { IPageNode } from './page-nodes'

export type ConfiguredEventsMap = Map<string, EventMapping>

export interface IPageCache {
    get(): HMICommand | HMICommand[] | null
    put(data: HMICommand | HMICommand[] | null): void
    containsData(): boolean
    clear()
}

export interface IPageHandlerCache {
    // history management
    getCurrentPage(): IPageHistory | null
    addToHistory(pageHistory: IPageHistory): void
    resetHistory(): void
    findLastPageInHistory(): IPageHistory | null
    removeLastFromHistory(): void
    getLastFromHistory(): IPageHistory

    // page management
    isPageKnown(pageId: PageId): boolean
    getPage(pageId: PageId): IPageNode | null
    addPage(pageId: PageId, pageNode: IPageNode): void
    removePage(pageNode: IPageNode): void
    getAllKnownPages(): IPageNode[]
}

export interface IPageHandler {
    resetHistory(): void

    registerPage(page: IPageNode): void
    deregisterPage(page: IPageNode): void

    isPageKnown(pageId: PageId): boolean
    getAllKnownPages(): IPageNode[]

    getCurrentPage(): IPageHistory
    clearActiveStatusOfAllPages(): void

    showPopup(source: string, entityId: string)
    closePopup(): void

    showNotification(notifyData: NotifyData): void

    activateStartupPage(): void
    activateScreenSaver(): IStatus

    onPageUpdateRequest(page: IPageNode): void
    onPageIdNavigationRequest(pageId: PageId): void
    onPageNavigationRequest(page: string): void
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
    dirty: boolean
    entities: PageEntityData[]
}

export type ScreenSaverBaseConfig = PageConfig & {
    doubleTapToExit: boolean
}

// #region callbacks
export type OnEventCallback = (eventArgs: EventArgs) => void
export type OnSensorDataCallback = (msg: any) => void
// #endregion callbacks
