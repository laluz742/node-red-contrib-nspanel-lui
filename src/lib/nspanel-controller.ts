import * as nEvents from 'events'
import { v4 as uuidv4 } from 'uuid'
import { scheduleTask, CronosTask } from 'cronosjs'

import { Logger } from '@lib/logger'
import { NSPanelMqttHandler } from '@lib/nspanel-mqtt-handler'
import { NSPanelUpdater } from '@lib/nspanel-updater'
import { SimpleControllerCache } from '@lib/nspanel-controller-cache'
import { NSPanelNodeUtils } from '@lib/nspanel-node-utils'
import { NSPanelPopupHelpers } from '@lib/nspanel-popup-helpers'

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
    TasmotaStatus2EventArgs,
    NluiDriverVersionEventArgs,
    StatusLevel,
} from '@types'
import {
    STR_LUI_CMD_PAGETYPE,
    STR_LUI_CMD_TIMEOUT,
    STR_LUI_CMD_ACTIVATE_POPUP_NOTIFY,
    STR_LUI_CMD_ACTIVATE_STARTUP_PAGE,
    STR_LUI_CMD_ACTIVATE_SCREENSAVER,
    STR_LUI_CMD_DATE,
    STR_LUI_CMD_DIMMODE,
    STR_LUI_CMD_TIME,
    STR_TASMOTA_CMD_BUZZER,
    STR_TASMOTA_CMD_DETACH_RELAYS,
    STR_TASMOTA_CMD_RELAY,
    STR_TASMOTA_CMD_TELEPERIOD,
    STR_LUI_DELIMITER,
    STR_PAGE_TYPE_CARD_THERMO,
} from '@lib/nspanel-constants'

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
    private _panelMqttHandler: IPanelMqttHandler = null
    private _panelUpdater: IPanelUpdater = null
    private _panelConfig: PanelConfig
    private _i18n: NodeRedI18nResolver
    private _cache: IControllerCache

    private _panelDimModes: PanelDimModes = {
        isNight: false,
        day: { isConfigured: false, dimLow: 100, dimHigh: 100, start: { hours: 0, minutes: 0 } },
        night: { isConfigured: false, dimLow: 100, dimHigh: 100, start: { hours: 0, minutes: 0 } },
    }

    constructor(panelConfig: PanelConfig, i18n: NodeRedI18nResolver) {
        super()
        this._cache = new SimpleControllerCache()
        this._panelConfig = panelConfig
        this._i18n = i18n

        this.init(panelConfig)
    }

    private onPageIdNavigationRequest(pageId: PageId): void {
        //TODO: if empty nav to last page

        if (this._cache.isPageKnown(pageId)) {
            var pageNode: IPageNode | null = this._cache.getPage(pageId)
            if (pageNode !== null) {
                const pageHistory: IPageHistory = {
                    historyType: 'page',
                    pageNode: pageNode,
                }
                this.setCurrentPage(pageHistory)
            }
        }
    }

    private onPageNavigationRequest(page: string): void {
        // is id?
        if (this._cache.isPageKnown(page)) {
            this.onPageIdNavigationRequest(page)
            return
        }

        const allKnownPages: IPageNode[] = this._cache.getAllKnownPages()
        var pageNodeId: string | null = null
        for (var i = 0; i < allKnownPages.length; i++) {
            if (allKnownPages[i].name == page) {
                pageNodeId = allKnownPages[i].id
                break
            }
        }

        if (pageNodeId != null) {
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
        this._cache.addPage(page.id, page)

        page.on('page:update', (page: IPageNode) => this.onPageUpdateRequest(page))
        page.on('nav:pageId', (pageId: PageId) => this.onPageIdNavigationRequest(pageId))
        page.on('nav:page', (page: string) => this.onPageNavigationRequest(page))
    }

    deregisterPage(page: IPageNode) {
        if (page === undefined) return

        this._cache.removePage(page)
        const currentPage: IPageHistory | null = this.getCurrentPage()
        const currentPageNode: IPageNode | null = currentPage?.pageNode ?? null

        if (currentPage != null && page.id == currentPageNode?.id) {
            //TODO: check if all pages have bExit events... so long... restart panel
            this.activateStartupPage() //FIXME: navigate to bExit or activate scrensaver?
        }
    }

    executeCommand(commands: CommandData | CommandData[]) {
        const cmds: CommandData[] = Array.isArray(commands) ? commands : [commands]

        cmds.forEach((cmdData) => {
            switch (cmdData.cmd) {
                case 'switch':
                    const switchParams = <SwitchCommandParams>cmdData.params
                    var switchRelayCmd: string = STR_TASMOTA_CMD_RELAY + (switchParams.id + 1)
                    this.sendCommandToPanel(switchRelayCmd, switchParams.active?.toString() ?? '')

                    break

                case 'checkForUpdates':
                    this._panelUpdater?.checkForUpdates()
                    break
            }
        })
    }

    public setNodeStatus(statusLevel: StatusLevel, msg: string): void {
        const nodeStatus = NSPanelNodeUtils.createNodeStatus(statusLevel, msg)
        this.emit('status', nodeStatus) // FIXME: wrong encoding!! (topic, msg, @see onControllerStatusEvent())
    }

    public showNotification(notifyData: NotifyData): void {
        if (notifyData === undefined || notifyData === null || typeof notifyData !== 'object') {
            return
        }

        const notifyHistory: IPageHistory = {
            historyType: 'notify',
            entityId: notifyData.notifyId ?? 'notify.' + uuidv4(),
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

        this.sendCommandToPanel(STR_TASMOTA_CMD_BUZZER, params.join(','))
    }

    dispose() {
        this.sendLWTToPanel()
        this.cronTaskEveryMinute?.stop()
        this.cronTaskHourly?.stop()
        this.cronTaskDimModeDay?.stop()
        this.cronTaskDimModeNight?.stop()
        this._panelMqttHandler?.dispose()
    }

    private init(panelConfig: PanelConfig) {
        log.info(`Starting panel controller for panel ${panelConfig.panel.topic}`)

        // preparing dim modes
        var tempStartTime = panelConfig.panel.panelDimLowStartTime
        if (panelConfig.panel.panelDimLowStartTime !== undefined) {
            this._panelDimModes.day.dimLow = panelConfig.panel.panelDimLow
            this._panelDimModes.day.dimHigh = panelConfig.panel.panelDimHigh
            this._panelDimModes.day.start = tempStartTime
            this._panelDimModes.day.isConfigured = true
        }
        tempStartTime = panelConfig.panel.panelDimLowNightStartTime
        if (panelConfig.panel.panelDimLowStartTime !== undefined) {
            this._panelDimModes.night.dimLow = panelConfig.panel.panelDimLowNight
            this._panelDimModes.day.dimHigh = panelConfig.panel.panelDimHighNight
            this._panelDimModes.night.start = tempStartTime
            this._panelDimModes.night.isConfigured = true
        }

        // initializing mqtt
        const mqttHandler = new NSPanelMqttHandler(panelConfig)
        this._panelMqttHandler = mqttHandler
        mqttHandler.on('event', (eventArgs) => this.onEvent(eventArgs))
        mqttHandler.on('msg', (msg) => this.onMessage(msg))
        mqttHandler.on('sensor', (msg) => this.onSensorData(msg))

        // initialize updater
        const panelUpdater = new NSPanelUpdater(this, mqttHandler, this._i18n, {
            autoUpdate: this._panelConfig.panel.autoUpdate,
        })
        this._panelUpdater = panelUpdater

        // notify controller node about state
        this.setNodeStatus('info', this._i18n('common.status.waitForPages'))
        /*setTimeout(() => {
    this.#delayPanelStartupFlag = false
}, 3000) //FIXME*/

        this.activateStartupPage()
    }

    private onEvent(eventArgs: EventArgs) {
        switch (eventArgs.event) {
            case 'startup':
                const startupEventArgs: StartupEventArgs = eventArgs as StartupEventArgs
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
                log.info('UNCATCHED onEvent default ' + JSON.stringify(eventArgs))
                // dispatch to active page
                this.notifyCurrentPageOfEvent('input', eventArgs)
        }
    }

    private onMessage(msg: EventArgs) {
        if (msg.event == 'version') {
            switch (msg.source) {
                case 'tasmota':
                    const status2EventArgs: TasmotaStatus2EventArgs = msg as TasmotaStatus2EventArgs
                    this._panelUpdater?.setTasmotaVersion(status2EventArgs.version)
                    break

                case 'nlui':
                    const nluiEventArgs: NluiDriverVersionEventArgs = msg as NluiDriverVersionEventArgs
                    this._panelUpdater?.setBerryDriverVersion(nluiEventArgs.version)

                    break
            }
        } else {
            log.info('UNCATCHED msg ' + JSON.stringify(msg))
        }
    }

    private onSensorData(eventArgs: EventArgs) {
        if (eventArgs.type == 'sensor') {
            this.notifyControllerNode(eventArgs)
        }
        this.notifyCurrentPageOfEvent('input', eventArgs)

        // send sensor data to thermo page
        var thermoPageNodes: IPageNode[] =
            this._cache.getAllKnownPages()?.filter((pageNode) => pageNode.getPageType() == STR_PAGE_TYPE_CARD_THERMO) ??
            []
        if (thermoPageNodes.length >= 1) {
            for (const thermoPageNode of thermoPageNodes) {
                this.notifyPageNode(thermoPageNode, 'input', eventArgs)
            }
        }
    }

    private onPageUpdateRequest(page: IPageNode): void {
        const currentPage = this.getCurrentPage()
        const currentPageNode = currentPage?.pageNode
        if (currentPage != null && currentPageNode?.id == page.id) {
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

        this._panelUpdater?.setHmiVersion(startupEventArgs.hmiVersion)
        this.setNodeStatus('info', this._i18n('common.status.panelInit'))

        // prepare dim mode
        var now: Date = new Date()
        var dimModeNightStart = new Date()
        dimModeNightStart.setHours(this._panelDimModes.night.start.hours, this._panelDimModes.night.start.minutes, 0, 0)
        if (now >= dimModeNightStart) {
            this, (this._panelDimModes.isNight = true)
        }

        this.sendTimeoutToPanel()
        this.sendDimModeToPanel()
        this.sendTimeToPanel()
        this.sendDateToPanel()
        this.sendDetachRelays(this._panelConfig.panel.detachRelays)
        this.sendTelePeriod(this._panelConfig.panel.telePeriod)

        if (this.cronTaskHourly === null) {
            this.cronTaskHourly = scheduleTask('@hourly', () => this.onCronHourly(), {})
        }
        if (this.cronTaskEveryMinute === null) {
            this.cronTaskEveryMinute = scheduleTask('0 */1 * * * *', () => this.onCronEveryMinute(), {})
        }

        if (this.cronTaskDimModeDay === null && this._panelDimModes.day.isConfigured) {
            this.cronTaskDimModeDay = scheduleTask(
                `0 ${this._panelDimModes.day.start.minutes} ${this._panelDimModes.day.start.hours} * * *`,
                () => {
                    this._panelDimModes.isNight = false
                    this.sendDimModeToPanel()
                },
                {}
            )
        }
        if (this.cronTaskDimModeNight === null && this._panelDimModes.night.isConfigured) {
            this.cronTaskDimModeNight = scheduleTask(
                `0 ${this._panelDimModes.night.start.minutes} ${this._panelDimModes.night.start.hours} * * *`,
                () => {
                    this._panelDimModes.isNight = true
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

        if (this._panelConfig.panel.screenSaverOnStartup) {
            this.activateScreenSaver()
        }
        this.setNodeStatus('info', this._i18n('common.status.panelStarted'))
    }

    private getCurrentPage(): IPageHistory | null {
        return this._cache.getCurrentPage()
    }

    private setCurrentPage(pageHistory: IPageHistory) {
        const lastPage = this.getCurrentPage()
        lastPage?.pageNode?.setActive(false)

        this._cache.addToHistory(pageHistory)

        pageHistory.pageNode?.setActive(true)
        this.renderPage(pageHistory, true)
    }

    private renderPage(pageHistory: IPageHistory, fullUpdate: boolean = false) {
        const pageNode = pageHistory?.pageNode

        switch (pageHistory.historyType) {
            case 'page':
                if (pageNode != null) {
                    if (fullUpdate) {
                        this.sendToPanel(STR_LUI_CMD_PAGETYPE + pageNode.getPageType())
                        this.sendTimeoutToPanel(pageNode.getTimeout())
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

    private onPopupOpen(eventArgs: EventArgs) {
        const currentPage = this.getCurrentPage()

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
        this._cache.removeLastFromHistory()

        // TODO: asserts is page before popup
        const currentPage: IPageHistory = this._cache.getLastFromHistory()
        this.renderPage(currentPage, true)
    }

    private clearActiveStatusOfAllPages(): void {
        this._cache.getAllKnownPages()?.forEach((pageNode) => {
            pageNode.setActive(false)
        })
    }

    private notifyCurrentPageOfEvent(event: string, eventArgs: EventArgs) {
        var currentPage: IPageHistory | null = this.getCurrentPage()

        this.notifyPageNode(currentPage?.pageNode, event, eventArgs)
    }

    private notifyPageNode(page: IPageNode, event: string, eventArgs: EventArgs) {
        if (page != null) {
            const nodeMsg = {
                topic: eventArgs.type,
                payload: Object.assign({}, eventArgs),
            }
            // when hw buttons do not control power outputs translate to event
            if (
                this._panelConfig.panel.detachRelays &&
                eventArgs.type == 'hw' &&
                eventArgs.event == 'button' &&
                eventArgs.event2 == 'press'
            ) {
                nodeMsg.topic = 'event'
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
        this._cache.resetHistory()

        var screenSaverPageNodes: IPageNode[] =
            this._cache.getAllKnownPages()?.filter((pageNode) => pageNode.isScreenSaver()) ?? []

        if (screenSaverPageNodes.length >= 1) {
            const pageHistory: IPageHistory = {
                historyType: 'page',
                pageNode: screenSaverPageNodes[0],
            }
            this.setCurrentPage(pageHistory)

            if (screenSaverPageNodes.length >= 2) {
                this.setNodeStatus('warn', this._i18n('common.status.tooManyScreenSaver'))
                log.warn('More than one screensaver attached. Found ' + screenSaverPageNodes.length)
            }
        } else {
            this.setNodeStatus('warn', this._i18n('common.status.noScreenSaverPage'))
            log.warn('No screensaver found.')

            this.sendToPanel(STR_LUI_CMD_ACTIVATE_SCREENSAVER)
        }
    }

    private activateStartupPage() {
        this.sendToPanel(STR_LUI_CMD_ACTIVATE_STARTUP_PAGE)
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
            var pageData: string[] = [STR_LUI_CMD_ACTIVATE_POPUP_NOTIFY]
            pageData = pageData.concat(notifyPageData)
            this.sendToPanel(pageData)

            //FIXME: beep
        }
    }

    private sendToPanel(data: Array<string> | string | null) {
        if (data == null || this._panelMqttHandler === null) return

        if (typeof data === 'object') {
            for (var d in data) {
                this._panelMqttHandler.sendToPanel({ payload: data[d] })
            }
        } else {
            this._panelMqttHandler.sendToPanel({ payload: data })
        }
    }

    private sendLWTToPanel() {
        var offline = this._i18n('nspanel-controller.panel.offline')
        var stopped = this._i18n('nspanel-controller.panel.serverStopped')

        const date = new Date()
        const timeHours = date.getHours()
        const timeMinutes = date.getMinutes()

        const timeStr = timeHours.toString().padStart(2, '0') + ':' + timeMinutes.toString().padStart(2, '0')

        var cmds = [
            STR_LUI_CMD_ACTIVATE_SCREENSAVER,
            'statusUpdate',
            STR_LUI_CMD_TIME + offline,
            STR_LUI_CMD_DATE + stopped,
            'notify~~' + timeStr,
        ] //TODO: reattach relays?
        this.sendToPanel(cmds)
    }

    private sendCommandToPanel(cmd: string, data: string) {
        this._panelMqttHandler?.sendCommandToPanel(cmd, { payload: data })
    }

    // #region basic panel commands
    private sendDetachRelays(detach: boolean = false) {
        const state = detach ? '1' : '0'

        this.sendCommandToPanel(STR_TASMOTA_CMD_DETACH_RELAYS, state)
    }

    private sendTelePeriod(telePeriod: number = 1) {
        const telePeriodStr = '' + telePeriod
        this.sendCommandToPanel(STR_TASMOTA_CMD_TELEPERIOD, telePeriodStr)
    }

    private sendTimeToPanel() {
        const date = new Date()
        const timeHours = date.getHours()
        const timeMinutes = date.getMinutes()

        const timeStr = timeHours.toString().padStart(2, '0') + ':' + timeMinutes.toString().padStart(2, '0')

        this.sendToPanel(STR_LUI_CMD_TIME + timeStr)
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
        this.sendToPanel(STR_LUI_CMD_DATE + dateStr)
    }

    private sendDimModeToPanel() {
        // TODO: could panelDimLow/high be empty
        const dimLow = this._panelDimModes.isNight
            ? this._panelConfig.panel.panelDimLowNight
            : this._panelConfig.panel.panelDimLow
        const dimHigh = this._panelDimModes.isNight
            ? this._panelConfig.panel.panelDimHighNight
            : this._panelConfig.panel.panelDimHigh

        this.sendToPanel(STR_LUI_CMD_DIMMODE + dimLow + STR_LUI_DELIMITER + dimHigh)
    }

    private sendTimeoutToPanel(timeout: number | null = null) {
        var tempTimeout = timeout === null ? this._panelConfig.panel.panelTimeout : timeout
        this.sendToPanel(STR_LUI_CMD_TIMEOUT + tempTimeout)
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
