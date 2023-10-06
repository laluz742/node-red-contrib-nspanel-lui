import { CommandData, IDisposable, IPageNode, NotifyData, PageId, VoidCallback } from '.'

export type PageMap = Map<string, IPageNode>

export interface IPageHistory {
    historyType: 'page' | 'popup' | 'notify'
    pageNode: IPageNode
    popupType?: string
    entityId?: string
    notifyData?: NotifyData
}

export interface IControllerCache {
    // history management
    getCurrentPage(): IPageHistory | null
    addToHistory(pageHistory: IPageHistory): void
    resetHistory(): void
    findLastPageInHistory(): IPageHistory
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