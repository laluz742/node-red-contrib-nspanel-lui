import { v4 as uuidv4 } from 'uuid'

import { Status } from './status'
import { SimplePageHandlerCache } from './nspanel-page-handler-cache'
import { NSPanelPopupHelpers } from './nspanel-popup-helpers'

import {
    PageId,
    IPageHandlerCache as IPageCache,
    IPageHandler,
    IPageNode,
    IPageHistory,
    HMICommand,
    IStatus,
    IPanelCommandHandler,
    NotifyData,
    CommandData,
} from '../types/types'
import * as NSPanelConstants from './nspanel-constants'

export type IPageHandlerOptions = {
    beepOnNotifications: boolean
}

export class NSPanelPageHandler implements IPageHandler {
    private _options: IPageHandlerOptions

    private _cache: IPageCache

    private _cmdHandler: IPanelCommandHandler

    constructor(cmdHandler: IPanelCommandHandler, options: IPageHandlerOptions) {
        this._cmdHandler = cmdHandler
        this._options = options

        this._cache = new SimplePageHandlerCache()
    }

    protected getCache(): IPageCache {
        return this._cache
    }

    protected getCommandHandler(): IPanelCommandHandler {
        return this._cmdHandler
    }

    public registerPage(page: IPageNode) {
        this.getCache().addPage(page.id, page)

        page.on('page:update', (pageToUpdate: IPageNode) => this.onPageUpdateRequest(pageToUpdate))

        page.on('nav:pageId', (pageIdToNavTo: PageId) => this.onPageIdNavigationRequest(pageIdToNavTo))
        page.on('nav:page', (pageToNavTo: string) => this.onPageNavigationRequest(pageToNavTo))

        page.on('page:send', (pageOfSend: IPageNode, cmds: HMICommand | HMICommand[]) =>
            this.onPageSendRequest(pageOfSend, cmds)
        )
        page.on(
            'page:cmd',
            (_pageOfCmd: IPageNode, cmds: CommandData | CommandData[]) => this.getCommandHandler()?.executeCommand(cmds)
        )
    }

    public deregisterPage(page: IPageNode): void {
        if (page === undefined) return

        this.getCache().removePage(page)
        const currentPage: IPageHistory | null = this.getCurrentPage()
        const currentPageNode: IPageNode | null = currentPage?.pageNode ?? null

        if (currentPage != null && page.id === currentPageNode?.id) {
            // TODO: check if all pages have bExit events... so long... restart panel
            this.activateStartupPage() // TODO: navigate to bExit or activate scrensaver?
        }
    }

    public getCurrentPage(): IPageHistory {
        return this.getCache().getCurrentPage()
    }

    public setCurrentPage(pageHistory: IPageHistory) {
        const lastPage = this.getCurrentPage()
        lastPage?.pageNode?.setActive(false)

        this.getCache().addToHistory(pageHistory)

        pageHistory.pageNode?.setActive(true)
        this.renderPage(pageHistory, true)
    }

    public resetHistory(): void {
        this.getCache().resetHistory()
    }

    public isPageKnown(pageId: PageId): boolean {
        return this.getCache()?.isPageKnown(pageId)
    }

    public getAllKnownPages(): IPageNode[] {
        return this.getCache().getAllKnownPages()
    }

    public clearActiveStatusOfAllPages(): void {
        this.getAllKnownPages()?.forEach((pageNode) => {
            pageNode.setActive(false)
        })
    }

    private renderPage(pageHistory: IPageHistory, fullUpdate: boolean = false) {
        const pageNode = pageHistory?.pageNode

        switch (pageHistory?.historyType) {
            case 'page':
                if (pageNode != null) {
                    if (fullUpdate) {
                        const hmiCmd: HMICommand = {
                            cmd: NSPanelConstants.STR_LUI_CMD_PAGETYPE,
                            params: pageNode.getPageType(),
                        }
                        this.getCommandHandler()?.sendHMICommand(hmiCmd)
                        this.getCommandHandler()?.sendTimeoutToPanel(pageNode.getTimeout())
                    }

                    this.updatePage(pageNode)
                }
                break

            case 'popup':
                if (pageNode != null && pageHistory.popupType && pageHistory.entityId) {
                    this.updatePopup(pageNode, pageHistory.popupType, pageHistory.entityId)
                }
                break

            case 'notify':
                this.updateNotification(pageHistory)
                break
        }
    }

    protected updatePage(page: IPageNode) {
        const data: HMICommand[] = []
        if (page.isForceRedraw()) {
            data.push({ cmd: NSPanelConstants.STR_LUI_CMD_PAGETYPE, params: page.getPageType() })
        }

        const pageData = page.generatePage()
        if (Array.isArray(pageData)) {
            data.push(...pageData)
        } else {
            data.push(pageData)
        }

        this.getCommandHandler()?.sendHMICommand(data)
    }

    // #region popups
    public showPopup(source: string, entityId: string): void {
        const currentPage = this.getCurrentPage()

        if (currentPage !== null) {
            const popupHistory: IPageHistory = {
                historyType: 'popup',
                pageNode: currentPage.pageNode,
                popupType: source,
                entityId,
            }
            this.setCurrentPage(popupHistory)
        }
    }

    public closePopup() {
        this.getCache().removeLastFromHistory()

        const currentPage: IPageHistory = this.getCache().getLastFromHistory()
        this.renderPage(currentPage, true)
    }

    protected updatePopup(page: IPageNode, popupType: string, entityId: string) {
        const pageData = page.generatePopupDetails(popupType, entityId)
        if (pageData !== null) {
            this.getCommandHandler()?.sendHMICommand(pageData)
        } else {
            // close popup, if it cannot be generated, thus is not supported yet
            this.closePopup()
        }
    }
    // #endregion popups

    // #region notifications
    public showNotification(notifyData: NotifyData): void {
        if (notifyData == null || typeof notifyData !== 'object') {
            return
        }

        const notifyHistory: IPageHistory = {
            historyType: 'notify',
            entityId: notifyData.notifyId ?? `notify.${uuidv4()}`,
            notifyData,
        }

        this.setCurrentPage(notifyHistory)
        if (this._options.beepOnNotifications || notifyData.beep) {
            this.getCommandHandler()?.sendBuzzerCommand(3, 2, 1)
        }
    }

    protected updateNotification(history: IPageHistory) {
        const notifyHmiCmd = NSPanelPopupHelpers.generatePopupNotify(history.notifyData)

        if (notifyHmiCmd !== null) {
            const cmds: HMICommand[] = [
                { cmd: NSPanelConstants.STR_LUI_CMD_PAGETYPE, params: NSPanelConstants.STR_PAGE_TYPE_POPUP_NOTIFY },
                notifyHmiCmd,
            ]
            this.getCommandHandler()?.sendHMICommand(cmds)

            if (this._options.beepOnNotifications || history.notifyData.beep) {
                this.getCommandHandler()?.sendBuzzerCommand(3, 2, 1)
            }
        }
    }
    // #endregion notifications

    public activateStartupPage(): void {
        const hmiCmd: HMICommand = {
            cmd: NSPanelConstants.STR_LUI_CMD_PAGETYPE,
            params: NSPanelConstants.STR_PAGE_TYPE_CARD_STARTUP,
        }
        this.getCommandHandler()?.sendHMICommand(hmiCmd)
    }

    public activateScreenSaver(): IStatus {
        let result: IStatus = Status.Ok()

        this.getCache().resetHistory()

        const screenSaverPageNodes: IPageNode[] =
            this.getCache()
                .getAllKnownPages()
                ?.filter((pageNode) => pageNode.isScreenSaver()) ?? []

        if (screenSaverPageNodes.length >= 1) {
            const firstScreenSaver: IPageNode = screenSaverPageNodes[0]
            const pageHistory: IPageHistory = {
                historyType: 'page',
                pageNode: firstScreenSaver,
            }
            this.setCurrentPage(pageHistory)

            if (screenSaverPageNodes.length >= 2) {
                result = Status.Warning(`More than one screensaver attached. Found ${screenSaverPageNodes.length}`)
            }
        } else {
            const hmiCmd: HMICommand = {
                cmd: NSPanelConstants.STR_LUI_CMD_PAGETYPE,
                params: NSPanelConstants.STR_PAGE_TYPE_CARD_SCREENSAVER,
            }
            this.getCommandHandler()?.sendHMICommand(hmiCmd)

            result = Status.Error('No screensaver found')
        }

        return result
    }

    public onPageUpdateRequest(page: IPageNode): void {
        const currentPage = this.getCurrentPage()
        const currentPageNode = currentPage?.pageNode
        if (currentPage != null && currentPageNode?.id === page.id) {
            this.renderPage(currentPage)
        }
    }

    public onPageIdNavigationRequest(pageId: PageId): void {
        if (this.getCache().isPageKnown(pageId)) {
            const pageNode: IPageNode | null = this.getCache().getPage(pageId)
            if (pageNode !== null) {
                const pageHistory: IPageHistory = {
                    historyType: 'page',
                    pageNode,
                }
                this.setCurrentPage(pageHistory)
            }
        }
    }

    public onPageNavigationRequest(page: string): void {
        // is id?
        if (this.getCache().isPageKnown(page)) {
            this.onPageIdNavigationRequest(page)
            return
        }

        const allKnownPages: IPageNode[] = this.getCache().getAllKnownPages()
        let pageNodeId: string | null = null
        for (let i = 0; i < allKnownPages.length; i += 1) {
            // eslint-disable-next-line eqeqeq
            if (allKnownPages[i].name == page) {
                pageNodeId = allKnownPages[i].id
                break
            }
        }

        if (pageNodeId != null) {
            this.onPageIdNavigationRequest(pageNodeId)
        }
    }

    private onPageSendRequest(page: IPageNode, cmds: HMICommand | HMICommand[]): void {
        if (page == null || !this.getCache()?.isPageKnown(page.id)) return

        this.getCommandHandler()?.sendHMICommand(cmds)
    }
}
