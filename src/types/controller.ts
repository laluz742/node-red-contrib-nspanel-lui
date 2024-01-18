import { IDisposable } from './base'
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
    screenSaverOnStartup: boolean
    beepOnNotifications: boolean
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
