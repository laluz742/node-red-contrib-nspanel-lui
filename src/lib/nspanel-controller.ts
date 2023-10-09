import * as nEvents from 'events'
import { v4 as uuidv4 } from 'uuid'
import { scheduleTask, CronosTask } from 'cronosjs'

import { Logger } from './logger'
import { NSPanelMqttHandler } from './nspanel-mqtt-handler'
import { NSPanelUpdater } from './nspanel-updater'

import {
    Nullable,
    PanelConfig,
    EventArgs,
    SplitTime,
    PageMap,
    IPageNode,
    PageId,
    IPanelController,
    IPanelMqttHandler,
    NodeRedI18nResolver,
    IPanelUpdater,
    StartupEventArgs,
    CommandData,
    SwitchCommandParams,
    IPageHistory,
    IControllerCache,
    NotifyData,
} from '../types'
import { SimpleControllerCache } from './nspanel-controller-cache'
import { NSPanelPopupHelpers } from './nspanel-popup-helpers'
import {
    STR_CMD_TASMOTA_BUZZER,
    STR_CMD_TASMOTA_DETACH_RELAYS,
    STR_CMD_TASMOTA_RELAY,
    STR_CMD_TASMOTA_TELEPERIOD,
} from './nspanel-constants'

const log = Logger('NSPanelController')

declare type PanelDimMode = {
    isConfigured: boolean
    dimLow: number
    dimHigh: number
    start: SplitTime
}

declare type PanelDimModes = {
    isNight: boolean
    day: PanelDimMode
    night: PanelDimMode
}

export class NSPanelController extends nEvents.EventEmitter implements IPanelController {
    private panelMqttHandler: Nullable<IPanelMqttHandler> = null
    private panelUpdater: Nullable<IPanelUpdater> = null
    private panelConfig: PanelConfig
    private i18n: NodeRedI18nResolver
    private cache: IControllerCache

    private panelDimModes: PanelDimModes = {
        isNight: false,
        day: { isConfigured: false, dimLow: 100, dimHigh: 100, start: { hours: 0, minutes: 0 } },
        night: { isConfigured: false, dimLow: 100, dimHigh: 100, start: { hours: 0, minutes: 0 } },
    }

    constructor(panelConfig: PanelConfig, i18n: NodeRedI18nResolver) {
        super()
        this.cache = new SimpleControllerCache()
        this.panelConfig = panelConfig
        this.i18n = i18n

        this.init(panelConfig)
    }

    private onPageIdNavigationRequest(pageId: PageId): void {
        //TODO: if empty nav to last page

        if (this.cache.isPageKnown(pageId)) {
            var pageNode: IPageNode | undefined = this.cache.getPage(pageId)
            if (pageNode !== null) {
                const pageHistory: IPageHistory = {
                    historyType: 'page',
                    pageNode: pageNode,
                    popupType: null,
                }
                this.setCurrentPage(pageHistory)
            }
        }
    }

    private onPageNavigationRequest(page: string): void {
        // is id?
        if (this.cache.isPageKnown(page)) {
            this.onPageIdNavigationRequest(page)
            return
        }

        const allKnownPages: IPageNode[] = this.cache.getAllKnownPages()
        var pageNodeId: string = null
        for (var i = 0; i < allKnownPages.length; i++) {
            if (allKnownPages[i].name == page) {
                pageNodeId = allKnownPages[i].id
                break
            }
        }

        if (pageNodeId !== null) {
            this.onPageIdNavigationRequest(pageNodeId)
        }
    }

    registerPages(pages: PageMap) {
        for (var i in pages) {
            this.registerPage(pages[i])
        }
    }

    registerPage(page: IPageNode) {
        //TODO: ignore navTo Node
        this.cache.addPage(page.id, page)

        page.on('page:update', (page: IPageNode) => this.onPageUpdateRequest(page))
        page.on('nav:pageId', (pageId: PageId) => this.onPageIdNavigationRequest(pageId))
        page.on('nav:page', (page: string) => this.onPageNavigationRequest(page))
    }

    deregisterPage(page: IPageNode) {
        if (page === undefined) return

        this.cache.removePage(page)
        const currentPage: IPageHistory = this.getCurrentPage()
        const currentPageNode: IPageNode = currentPage?.pageNode

        if (currentPage !== undefined && page.id == currentPageNode.id) {
            //TODO: check if all pages have bExit events... so long... restart panel
            this.activateStartupPage() //FIXME: navigate to bExit or activate scrensaver?
        }
    }

    executeCommand(commands: CommandData | CommandData[]) {
        const cmds: CommandData[] = Array.isArray(commands) ? commands : [commands]

        cmds.forEach((cmdData) => {
            switch (cmdData.cmd) {
                case 'switch': {
                    const switchParams = <SwitchCommandParams>cmdData.params
                    var switchRelayCmd: string = STR_CMD_TASMOTA_RELAY + (switchParams.id + 1)
                    this.sendCommandToPanel(switchRelayCmd, switchParams.active?.toString() ?? '')
                }
            }
        })
    }

    showNotification(notifyData: NotifyData): void {
        if (notifyData === undefined || notifyData === null || typeof notifyData !== 'object') {
            return
        }

        const notifyHistory: IPageHistory = {
            historyType: 'notify',
            entityId: notifyData.notifyId ?? 'notify.' + uuidv4(),
            pageNode: null,
            notifyData: notifyData,
        }

        this.setCurrentPage(notifyHistory)
    }

    sendBuzzerCommand(count: number, beepDuration?: number, silenceDuration?: number, tune?: number) {
        //TODO: message
        var params = [count]
        if (beepDuration !== undefined) params.push(beepDuration)
        if (silenceDuration !== undefined) params.push(silenceDuration)
        if (tune !== undefined) params.push(tune)

        this.sendCommandToPanel(STR_CMD_TASMOTA_BUZZER, params.join(','))
    }

    dispose() {
        this.sendLWTToPanel()
        this.cronTaskEveryMinute?.stop()
        this.cronTaskHourly?.stop()
        this.cronTaskDimModeDay?.stop()
        this.cronTaskDimModeNight?.stop()
        this.panelMqttHandler?.dispose()
    }

    private init(panelConfig: PanelConfig) {
        log.info(`Starting panel controller for panel ${panelConfig.panel.topic}`)

        // preparing dim modes
        var tempStartTime = panelConfig.panel.panelDimLowStartTime
        if (panelConfig.panel.panelDimLowStartTime !== undefined) {
            this.panelDimModes.day.dimLow = panelConfig.panel.panelDimLow
            this.panelDimModes.day.dimHigh = panelConfig.panel.panelDimHigh
            this.panelDimModes.day.start = tempStartTime
            this.panelDimModes.day.isConfigured = true
        }
        tempStartTime = panelConfig.panel.panelDimLowNightStartTime
        if (panelConfig.panel.panelDimLowStartTime !== undefined) {
            this.panelDimModes.night.dimLow = panelConfig.panel.panelDimLowNight
            this.panelDimModes.day.dimHigh = panelConfig.panel.panelDimHighNight
            this.panelDimModes.night.start = tempStartTime
            this.panelDimModes.night.isConfigured = true
        }

        // initializing mqtt
        const mqttHandler = new NSPanelMqttHandler(panelConfig)
        this.panelMqttHandler = mqttHandler
        mqttHandler.on('event', (eventArgs) => this.onEvent(eventArgs))
        mqttHandler.on('msg', (msg) => this.onMessage(msg))
        mqttHandler.on('sensor', (msg) => this.onSensorData(msg))

        // initialize updater
        const panelUpdater = new NSPanelUpdater()
        this.panelUpdater = panelUpdater

        // notify controller node about state
        this.emit('status', { type: 'info', msg: 'ctrl.waitForPages' })

        /*setTimeout(() => {
            this.#delayPanelStartupFlag = false
        }, 3000) //FIXME*/

        this.activateStartupPage()
    }

    private onEvent(eventArgs: EventArgs) {
        switch (eventArgs.event) {
            case 'startup':
                const startupEventArgs: StartupEventArgs = <StartupEventArgs>eventArgs
                this.clearActiveStatusOfAllPages()
                this.onPanelStartup(startupEventArgs)
                this.notifyControllerNode(eventArgs)
                break

            case 'sleepReached':
                this.activateScreenSaver()
                this.notifyControllerNode(eventArgs) //FIXME: set source to currentPage ?
                break

            case 'relay':
            case 'button':
                if (eventArgs.type == 'hw') {
                    this.notifyControllerNode(eventArgs)
                }
                this.notifyCurrentPageOfEvent('input', eventArgs)
                break

            case 'pageOpenDetail':
                this.onPopupOpen(eventArgs)
                this.notifyCurrentPageOfEvent('input', eventArgs)
                break
            case 'buttonPress2': // close pageOpenDetail
                if (eventArgs.source.startsWith('popup') && eventArgs.event2 == 'bExit') {
                    this.onPopupClose()
                }
                this.notifyCurrentPageOfEvent('input', eventArgs)
                break

            default:
                console.log('UNCATCHED onEvent default', eventArgs)
                // dispatch to active page
                this.notifyCurrentPageOfEvent('input', eventArgs)
        }
    }

    private onMessage(msg: any) {
        //FIXME: is not any
        console.log('RX MSG', msg)
    }

    private onSensorData(eventArgs: EventArgs) {
        if (eventArgs.type == 'sensor') {
            this.notifyControllerNode(eventArgs)
        }
        this.notifyCurrentPageOfEvent('input', eventArgs)
    }

    private onPageUpdateRequest(page: IPageNode): void {
        const currentPage: IPageHistory = this.getCurrentPage()
        const currentPageNode: IPageNode = currentPage?.pageNode
        if (currentPage !== undefined && currentPageNode?.id == page.id) {
            this.renderPage(currentPage)
        }
    }

    private delayPanelStartupFlag = true
    public onFlowsStarting(): void {
        this.delayPanelStartupFlag = true
    }
    public onFlowsStarted(): void {
        this.delayPanelStartupFlag = false
    }

    private onPanelStartup(startupEventArgs: StartupEventArgs) {
        //delay startup until pages had time to register
        if (this.delayPanelStartupFlag) return

        this.panelUpdater.setHmiVersion(startupEventArgs.hmiVersion)
        this.emit('status', { type: 'info', msg: 'ctrl.panelInit' })

        // prepare dim mode
        var now: Date = new Date()
        var dimModeNightStart = new Date()
        dimModeNightStart.setHours(this.panelDimModes.night.start.hours, this.panelDimModes.night.start.minutes, 0, 0)
        if (now >= dimModeNightStart) {
            this, (this.panelDimModes.isNight = true)
        }

        this.sendTimeoutToPanel()
        this.sendDimModeToPanel()
        this.sendTimeToPanel()
        this.sendDateToPanel()
        this.sendDetachRelays(this.panelConfig.panel.detachRelays)
        this.sendTelePeriod(this.panelConfig.panel.telePeriod)

        if (this.cronTaskHourly === null) {
            this.cronTaskHourly = scheduleTask('@hourly', () => this.onCronHourly(), {})
        }
        if (this.cronTaskEveryMinute === null) {
            this.cronTaskEveryMinute = scheduleTask('0 */1 * * * *', () => this.onCronEveryMinute(), {})
        }

        if (this.cronTaskDimModeDay === null && this.panelDimModes.day.isConfigured) {
            this.cronTaskDimModeDay = scheduleTask(
                `0 ${this.panelDimModes.day.start.minutes} ${this.panelDimModes.day.start.hours} * * *`,
                () => {
                    this.panelDimModes.isNight = false
                    this.sendDimModeToPanel()
                },
                {}
            )
        }
        if (this.cronTaskDimModeNight === null && this.panelDimModes.night.isConfigured) {
            this.cronTaskDimModeNight = scheduleTask(
                `0 ${this.panelDimModes.night.start.minutes} ${this.panelDimModes.night.start.hours} * * *`,
                () => {
                    this.panelDimModes.isNight = true
                    this.sendDimModeToPanel()
                },
                {}
            )
        }

        // query relay states
        this.executeCommand([
            { cmd: 'switch', params: { id: 0 } },
            { cmd: 'switch', params: { id: 1 } },
        ])

        if (this.panelConfig.panel.screenSaverOnStartup) {
            this.activateScreenSaver()
        }
        this.emit('status', { type: 'info', msg: 'ctrl.panelStarted' })
    }

    private getCurrentPage(): IPageHistory | null {
        return this.cache.getCurrentPage()
    }

    private setCurrentPage(pageHistory: IPageHistory) {
        const lastPage = this.getCurrentPage()
        lastPage?.pageNode?.setActive(false)

        this.cache.addToHistory(pageHistory)

        pageHistory.pageNode?.setActive(true)
        this.renderPage(pageHistory, true)
    }

    private renderPage(pageHistory: IPageHistory, fullUpdate: boolean = false) {
        const pageNode: IPageNode = pageHistory?.pageNode

        switch (pageHistory.historyType) {
            case 'page':
                if (pageNode !== null) {
                    if (fullUpdate) {
                        this.sendToPanel(`pageType~${pageNode.getPageType()}`)
                        this.sendTimeoutToPanel(pageNode.getTimeout())
                    }

                    this.updatePage(pageNode)
                }
                break

            case 'popup':
                if (pageNode !== null) {
                    this.updatePopup(pageNode, pageHistory.popupType, pageHistory.entityId)
                }
                break

            case 'notify':
                this.updateNotification(pageHistory)
                break
        }
    }

    private onPopupOpen(eventArgs: EventArgs) {
        const currentPage: IPageHistory | undefined = this.getCurrentPage()

        if (currentPage !== null) {
            const popupHistory: IPageHistory = {
                historyType: 'popup',
                pageNode: currentPage.pageNode,
                popupType: eventArgs.source,
                entityId: eventArgs.entityId,
            }
            this.setCurrentPage(popupHistory)
        }
    }

    private onPopupClose() {
        // TODO: asserts last is popup
        this.cache.removeLastFromHistory()

        // TODO: asserts is page before popup
        const currentPage: IPageHistory = this.cache.getLastFromHistory()
        this.renderPage(currentPage, true)
    }

    private clearActiveStatusOfAllPages(): void {
        this.cache.getAllKnownPages()?.forEach((pageNode) => {
            pageNode.setActive(false)
        })
    }

    private notifyCurrentPageOfEvent(event: string, eventArgs: EventArgs) {
        var currentPage: IPageHistory | null = this.getCurrentPage()
        if (currentPage !== null) {
            this.notifyPageNode(currentPage?.pageNode, event, eventArgs)
        }
    }

    private notifyPageNode(page: IPageNode, event: string, eventArgs: EventArgs) {
        if (page !== null) {
            const nodeMsg = {
                topic: eventArgs.type,
                payload: Object.assign({}, eventArgs),
            }

            page.emit(event, nodeMsg)
        }
    }

    private notifyControllerNode(eventArgs: EventArgs) {
        const nodeMsg = {
            topic: eventArgs.type,
            payload: Object.assign({}, eventArgs),
        }

        this.emit('event', nodeMsg)
    }

    private activateScreenSaver() {
        this.cache.resetHistory()

        var screenSaverPageNodes: IPageNode[] = []
        this.cache.getAllKnownPages()?.forEach((pageNode) => {
            if (pageNode.isScreenSaver()) {
                screenSaverPageNodes.push(pageNode)
            }
        })

        if (screenSaverPageNodes.length >= 1) {
            const pageHistory: IPageHistory = {
                historyType: 'page',
                pageNode: screenSaverPageNodes[0],
            }
            this.setCurrentPage(pageHistory)

            if (screenSaverPageNodes.length >= 2) {
                this.emit('status', { type: 'warn', msg: 'ctrl.tooManyScreenSaver' })
                log.warn('More than one screensaver attached. Found ' + screenSaverPageNodes.length)
            }
        } else {
            this.emit('status', { type: 'warn', msg: 'ctrl.noScreenSaverPage' })
            log.warn('No screensaver found.')
            this.sendToPanel(`pageType~screensaver`)
        }
    }

    private activateStartupPage() {
        this.sendToPanel('pageType~pageStartup')
    }

    private updatePage(page: IPageNode) {
        var pageData = page.generatePage()
        this.sendToPanel(pageData)
    }

    private updatePopup(page: IPageNode, popupType: string, entityId: string) {
        var pageData = page.generatePopupDetails(popupType, entityId)
        if (pageData !== null) {
            this.sendToPanel(pageData)
        } else {
            this.onPopupClose()
        }
    }

    private updateNotification(history: IPageHistory) {
        const notifyPageData = NSPanelPopupHelpers.generatePopupNotify(history.notifyData)

        if (notifyPageData !== null) {
            var pageData: string[] = ['pageType~popupNotify']
            pageData = pageData.concat(notifyPageData)
            this.sendToPanel(pageData)

            //FIXME: beep
        }
    }

    private sendToPanel(data: Array<string> | string) {
        if (this.panelMqttHandler === null) return

        if (typeof data === 'object') {
            for (var d in data) {
                this.panelMqttHandler.sendToPanel({ payload: data[d] })
            }
        } else {
            this.panelMqttHandler.sendToPanel({ payload: data })
        }
    }

    private sendLWTToPanel() {
        var offline = this.i18n('nspanel-controller.panel.offline')
        var stopped = this.i18n('nspanel-controller.panel.serverStopped')

        const date = new Date()
        const timeHours = date.getHours()
        const timeMinutes = date.getMinutes()

        const timeStr = timeHours.toString().padStart(2, '0') + ':' + timeMinutes.toString().padStart(2, '0')

        var cmds = ['pageType~screensaver', 'statusUpdate', 'time~' + offline, 'date~' + stopped, 'notify~~' + timeStr] //TODO: reattach relays?
        this.sendToPanel(cmds)
    }

    private sendCommandToPanel(cmd: string, data: string) {
        this.panelMqttHandler?.sendCommandToPanel(cmd, { payload: data })
    }

    // #region basic panel commands
    private sendDetachRelays(detach: boolean = false) {
        const state = detach ? '1' : '0'

        this.sendCommandToPanel(STR_CMD_TASMOTA_DETACH_RELAYS, state)
    }

    private sendTelePeriod(telePeriod: number = 1) {
        const telePeriodStr = '' + telePeriod
        this.sendCommandToPanel(STR_CMD_TASMOTA_TELEPERIOD, telePeriodStr)
    }

    private sendTimeToPanel() {
        const date = new Date()
        const timeHours = date.getHours()
        const timeMinutes = date.getMinutes()

        const timeStr = timeHours.toString().padStart(2, '0') + ':' + timeMinutes.toString().padStart(2, '0')

        this.sendToPanel('time~' + timeStr)
    }

    private sendDateToPanel() {
        const date = new Date()
        const dateOptions: Intl.DateTimeFormatOptions = {
            weekday: 'long', // short //TODO: config
            year: 'numeric',
            month: 'long', // short //TODO: config
            day: 'numeric',
        }

        const dateStr = date.toLocaleDateString(undefined, dateOptions)
        this.sendToPanel('date~' + dateStr)
    }

    private sendDimModeToPanel() {
        // TODO: could panelDimLow/high be empty
        const dimLow = this.panelDimModes.isNight
            ? this.panelConfig.panel.panelDimLowNight
            : this.panelConfig.panel.panelDimLow
        const dimHigh = this.panelDimModes.isNight
            ? this.panelConfig.panel.panelDimHighNight
            : this.panelConfig.panel.panelDimHigh

        this.sendToPanel(`dimmode~${dimLow}~${dimHigh}`)
    }

    private sendTimeoutToPanel(timeout: number | null = null) {
        var tempTimeout = timeout === null ? this.panelConfig.panel.panelTimeout : timeout
        this.sendToPanel(`timeout~${tempTimeout}`)
    }
    // #endregion basic panel commands

    // #region cron jobs
    private cronTaskEveryMinute: Nullable<CronosTask> = null
    private cronTaskHourly: Nullable<CronosTask> = null
    private cronTaskDimModeDay: Nullable<CronosTask> = null
    private cronTaskDimModeNight: Nullable<CronosTask> = null

    private onCronEveryMinute() {
        try {
            this.sendTimeToPanel()
        } catch (err: unknown) {
            if (err instanceof Error) {
                log.error('Error executing minutely cron: ' + err.message)
            }
        }
    }

    private onCronHourly() {
        try {
            this.sendDateToPanel()
            this.emit('cron:hourly')
        } catch (err: unknown) {
            if (err instanceof Error) {
                log.error('Error executing hourly cron: ' + err.message)
            }
        }
    }
    // #endregion cron jobs
}
