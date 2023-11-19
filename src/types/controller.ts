import { IDisposable, PageId } from './base'
import { CommandData, NotifyData } from './messages'
import { VoidCallback } from './nodered'
import { IPageNode } from './page-nodes'
import { PanelBasedConfig } from './pages'

export type PageMap = Map<string, IPageNode>

export type IPageHistoryType = 'page' | 'popup' | 'notify'

export interface IPageHistory {
    historyType: IPageHistoryType
    pageNode?: IPageNode
    popupType?: string
    entityId?: string
    notifyData?: NotifyData
}

export type PanelControllerConfig = PanelBasedConfig & {
    lang: string
    screenSaverOnStartup: boolean
    beepOnNotifications: boolean
}

export interface IControllerCache {
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

export interface IPanelController extends IDisposable {
    registerPages(pages: PageMap): void
    registerPage(page: IPageNode): void
    deregisterPage(page: IPageNode): void

    executeCommand(command: CommandData | CommandData[]): void
    showNotification(notifyData: NotifyData): void

    on(event: 'cron:daily', listener: VoidCallback): void
    onFlowsStarting(): void
    onFlowsStarted(): void
}
