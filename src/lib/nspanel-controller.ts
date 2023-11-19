import * as nEvents from 'events'
import { v4 as uuidv4 } from 'uuid'
import { scheduleTask, CronosTask } from 'cronosjs'
import dayjs from 'dayjs'
import 'dayjs/locale/de'
import 'dayjs/locale/en'

import { Logger } from './logger'
import { NSPanelMqttHandler } from './nspanel-mqtt-handler'
import { NSPanelUpdater } from './nspanel-updater'
import { SimpleControllerCache } from './nspanel-controller-cache'
import { NSPanelPopupHelpers } from './nspanel-popup-helpers'

import {
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
    BuzzerCommandParams,
    IPageHistory,
    IControllerCache,
    NotifyData,
    FirmwareEventArgs,
    StatusLevel,
    NodeStatus,
    PanelControllerConfig,
    HMICommand,
    TasmotaCommand,
} from '../types/types'
import * as NSPanelConstants from './nspanel-constants'
import { IPanelNodeEx } from '../types/panel'

const log = Logger('NSPanelController')

const DEFAULT_DATE_OPTIONS: Intl.DateTimeFormatOptions = {
    weekday: 'long', // short
    year: 'numeric',
    month: 'long', // short
    day: 'numeric',
}
const DEFAULT_TIME_OPTIONS: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
}

type PanelDimMode = {
    isConfigured: boolean
    dimLow: number
    dimHigh: number
    start: SplitTime
}

type PanelDimModes = {
    isNight: boolean
    day: PanelDimMode
    night: PanelDimMode
}

export class NSPanelController extends nEvents.EventEmitter implements IPanelController {
    private _panelMqttHandler: IPanelMqttHandler

    private _panelUpdater: IPanelUpdater

    private _ctrlConfig: PanelControllerConfig

    private _panelConfig: PanelConfig

    private _i18n: NodeRedI18nResolver

    private _cache: IControllerCache

    private _panelDimModes: PanelDimModes = {
        isNight: false,
        day: { isConfigured: false, dimLow: 100, dimHigh: 100, start: { hours: 0, minutes: 0 } },
        night: { isConfigured: false, dimLow: 100, dimHigh: 100, start: { hours: 0, minutes: 0 } },
    }

    constructor(ctrlConfig: PanelControllerConfig, panelNode: IPanelNodeEx, i18n: NodeRedI18nResolver) {
        super()
        this._ctrlConfig = ctrlConfig
        this._i18n = i18n
        this._cache = new SimpleControllerCache()

        this.init(panelNode)
    }

    private onPageIdNavigationRequest(pageId: PageId): void {
        if (this._cache.isPageKnown(pageId)) {
            const pageNode: IPageNode | null = this._cache.getPage(pageId)
            if (pageNode !== null) {
                const pageHistory: IPageHistory = {
                    historyType: 'page',
                    pageNode,
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

    registerPages(pages: PageMap) {
        // eslint-disable-next-line prefer-const
        for (let i in pages) {
            this.registerPage(pages[i])
        }
    }

    registerPage(page: IPageNode) {
        this._cache.addPage(page.id, page)

        page.on('page:update', (pageToUpdate: IPageNode) => this.onPageUpdateRequest(pageToUpdate))
        page.on('page:send', (pageOfSend: IPageNode, cmds: HMICommand | HMICommand[]) =>
            this.onPageSendRequest(pageOfSend, cmds)
        )
        page.on('page:cmd', (_pageOfCmd: IPageNode, cmds: CommandData | CommandData[]) => this.executeCommand(cmds))
        page.on('nav:pageId', (pageIdToNavTo: PageId) => this.onPageIdNavigationRequest(pageIdToNavTo))
        page.on('nav:page', (pageToNavTo: string) => this.onPageNavigationRequest(pageToNavTo))
    }

    deregisterPage(page: IPageNode) {
        if (page === undefined) return

        this._cache.removePage(page)
        const currentPage: IPageHistory | null = this.getCurrentPage()
        const currentPageNode: IPageNode | null = currentPage?.pageNode ?? null

        if (currentPage != null && page.id === currentPageNode?.id) {
            // TODO: check if all pages have bExit events... so long... restart panel
            this.activateStartupPage() // TODO: navigate to bExit or activate scrensaver?
        }
    }

    executeCommand(commands: CommandData | CommandData[]) {
        const cmds: CommandData[] = Array.isArray(commands) ? commands : [commands]

        cmds.forEach((cmdData) => {
            switch (cmdData.cmd) {
                case 'switch': {
                    const switchParams = cmdData.params as SwitchCommandParams
                    const switchRelayCmd: string = NSPanelConstants.STR_TASMOTA_CMD_RELAY + (switchParams.id + 1)
                    this.sendCommandToPanel({ cmd: switchRelayCmd, data: switchParams.active?.toString() ?? '' })

                    break
                }

                case 'toggle': {
                    const toggleParams = cmdData.params as SwitchCommandParams
                    const toggleRelayCmd: string = NSPanelConstants.STR_TASMOTA_CMD_RELAY + (toggleParams.id + 1)
                    this.sendCommandToPanel({
                        cmd: toggleRelayCmd,
                        data: NSPanelConstants.STR_TASMOTA_PARAM_RELAY_TOGGLE,
                    })
                    break
                }

                case 'beep': {
                    const params = cmdData.params as BuzzerCommandParams
                    this.sendBuzzerCommand(params.count, params.beepDuration, params.silenceDuration, params.tune)
                    break
                }

                case 'checkForUpdates': {
                    this._panelUpdater?.checkForUpdates()
                    break
                }
            }
        })
    }

    public setNodeStatus(statusLevel: StatusLevel, msg: string): void {
        const nodeStatus: NodeStatus = { statusLevel, msg }
        this.emit('status', nodeStatus)
    }

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
        if (this._ctrlConfig.beepOnNotifications || notifyData.beep) {
            this.sendBuzzerCommand(3, 2, 1)
        }
    }

    private sendBuzzerCommand(count: number, beepDuration?: number, silenceDuration?: number, tune?: number) {
        const params = [count]
        if (beepDuration != null) params.push(beepDuration)
        if (silenceDuration != null) params.push(silenceDuration)
        if (tune != null) params.push(tune)

        this.sendCommandToPanel({ cmd: NSPanelConstants.STR_TASMOTA_CMD_BUZZER, data: params.join(',') })
    }

    public dispose() {
        this.sendLWTToPanel()
        this.cronTaskEveryMinute?.stop()
        this.cronTaskHourly?.stop()
        this.cronTaskDimModeDay?.stop()
        this.cronTaskDimModeNight?.stop()
        this.cronTaskCheckForUpdates?.stop()
        this._panelMqttHandler?.dispose()
    }

    private init(panelNode: IPanelNodeEx) {
        const panelConfig = panelNode.getPanelConfig()
        this._panelConfig = panelConfig

        log.info(`Starting panel controller for panel ${panelConfig.panel.topic}`)

        this.initLocale(this._ctrlConfig.lang)

        // preparing dim modes
        let tempStartTime = panelConfig.panel.panelDimLowStartTime
        if (panelConfig.panel.panelDimLowStartTime != null) {
            this._panelDimModes.day.dimLow = panelConfig.panel.panelDimLow
            this._panelDimModes.day.dimHigh = panelConfig.panel.panelDimHigh
            this._panelDimModes.day.start = tempStartTime
            this._panelDimModes.day.isConfigured = true
        }
        tempStartTime = panelConfig.panel.panelDimLowNightStartTime
        if (panelConfig.panel.panelDimLowStartTime != null) {
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
            panelNodeTopic: this._panelConfig.panel.topic,
            autoUpdate: this._panelConfig.panel.autoUpdate,
            tasmotaOtaUrl: this._panelConfig.panel.tasmotaOtaUrl,
        })
        panelUpdater.on('update', (fwEventArgs: FirmwareEventArgs) => this.onUpdateEvent(fwEventArgs))
        this._panelUpdater = panelUpdater

        // notify controller node about state
        this.setNodeStatus('info', this._i18n('common.status.waitForPages'))
        this.activateStartupPage()
    }

    private initLocale(locale: string): void {
        switch (String.prototype.toLowerCase.apply(locale)) {
            case 'de':
                dayjs.locale('de')
                break

            default:
                dayjs.locale('en')
                break
        }
    }

    private onEvent(eventArgs: EventArgs) {
        switch (eventArgs.event) {
            case NSPanelConstants.STR_LUI_EVENT_STARTUP: {
                const startupEventArgs: StartupEventArgs = eventArgs as StartupEventArgs
                this.clearActiveStatusOfAllPages()
                this.onPanelStartup(startupEventArgs)
                this.notifyControllerNode(eventArgs)
                break
            }

            case NSPanelConstants.STR_LUI_EVENT_SLEEPREACHED:
                this.activateScreenSaver() // TODO: last notification, if applicable
                this.notifyControllerNode(eventArgs)
                break

            case 'relay':
            case 'button':
                if (eventArgs.type === 'hw') {
                    this.notifyControllerNode(eventArgs)
                }
                this.notifyCurrentPageOfEvent('input', eventArgs)
                break

            case NSPanelConstants.STR_LUI_EVENT_PAGEOPENDETAIL:
                this.onPopupOpen(eventArgs)
                this.notifyCurrentPageOfEvent('input', eventArgs)
                break

            case NSPanelConstants.STR_LUI_EVENT_BUTTONPRESS2: // close pageOpenDetail
                if (eventArgs.source.startsWith(NSPanelConstants.STR_UPDATE_NOTIFY_ID_PREFIX)) {
                    this.onPopupClose()
                    switch (eventArgs.event2) {
                        case NSPanelConstants.STR_LUI_EVENT_NOTIFY_ACTION:
                            this._panelUpdater.onUpdateNotificationResult(eventArgs.source, eventArgs.data)
                            break
                        case NSPanelConstants.STR_LUI_EVENT_BEXIT:
                            break
                    }
                } else if (
                    eventArgs.source.startsWith('popup') &&
                    eventArgs.event2 === NSPanelConstants.STR_LUI_EVENT_BEXIT
                ) {
                    this.onPopupClose()
                }
                this.notifyCurrentPageOfEvent('input', eventArgs)
                break

            default:
                log.debug(`UNCATCHED onEvent default ${JSON.stringify(eventArgs)}`)
                // dispatch to active page
                this.notifyCurrentPageOfEvent('input', eventArgs)
        }
    }

    private onMessage(msg: EventArgs) {
        if (msg.type === 'fw') {
            const fwEventArgs: FirmwareEventArgs = msg as FirmwareEventArgs
            this._panelUpdater?.onFirmwareEvent(fwEventArgs)
        } else {
            log.debug(`UNCATCHED msg ${JSON.stringify(msg)}`)
        }
    }

    private onUpdateEvent(fwEventArgs: FirmwareEventArgs): void {
        switch (fwEventArgs.event) {
            case 'update':
            case 'updateAvailable':
                this.notifyControllerNode(fwEventArgs)
                break
        }
    }

    private onSensorData(eventArgs: EventArgs) {
        if (eventArgs.type === 'sensor') {
            this.notifyControllerNode(eventArgs)
        }
        this.notifyCurrentPageOfEvent('input', eventArgs)

        // send sensor data to thermo page
        const thermoPageNodes: IPageNode[] =
            this._cache
                .getAllKnownPages()
                ?.filter((pageNode) => pageNode.getPageType() === NSPanelConstants.STR_PAGE_TYPE_CARD_THERMO) ?? []
        if (thermoPageNodes.length >= 1) {
            for (const thermoPageNode of thermoPageNodes) {
                this.notifyPageNode(thermoPageNode, 'input', eventArgs)
            }
        }
    }

    private onPageUpdateRequest(page: IPageNode): void {
        const currentPage = this.getCurrentPage()
        const currentPageNode = currentPage?.pageNode
        if (currentPage != null && currentPageNode?.id === page.id) {
            this.renderPage(currentPage)
        }
    }

    private onPageSendRequest(page: IPageNode, cmds: HMICommand | HMICommand[]): void {
        if (page == null || !this._cache.isPageKnown(page.id)) return

        this.sendToPanel(cmds)
    }

    private delayPanelStartupFlag = true

    public onFlowsStarting(): void {
        this.delayPanelStartupFlag = true
    }

    public onFlowsStarted(): void {
        this.delayPanelStartupFlag = false
    }

    private onPanelStartup(startupEventArgs: StartupEventArgs) {
        // delay startup until pages had time to register
        if (this.delayPanelStartupFlag) return
        this._cache.resetHistory()

        this._panelUpdater?.setHmiVersion(startupEventArgs.hmiVersion)
        this.setNodeStatus('info', this._i18n('common.status.panelInit'))

        // prepare dim mode
        const now: Date = new Date()
        const dimModeNightStart = new Date()
        dimModeNightStart.setHours(this._panelDimModes.night.start.hours, this._panelDimModes.night.start.minutes, 0, 0)
        if (now >= dimModeNightStart) {
            this._panelDimModes.isNight = true
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

        if (this._panelConfig.panel.enableUpdates && this.cronTaskCheckForUpdates == null) {
            this.cronTaskCheckForUpdates = scheduleTask(
                `0 ${this._panelConfig.panel.timeToCheckForUpdates.minutes} ${this._panelConfig.panel.timeToCheckForUpdates.hours} * * *`,
                () => this.onCronCheckForUpdates(),
                {}
            )
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

        if (this._ctrlConfig.screenSaverOnStartup) {
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

        switch (pageHistory?.historyType) {
            case 'page':
                if (pageNode != null) {
                    if (fullUpdate) {
                        const hmiCmd: HMICommand = {
                            cmd: NSPanelConstants.STR_LUI_CMD_PAGETYPE,
                            params: pageNode.getPageType(),
                        }
                        this.sendToPanel(hmiCmd)
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
        this._cache.removeLastFromHistory()

        const currentPage: IPageHistory = this._cache.getLastFromHistory()
        this.renderPage(currentPage, true)
    }

    private clearActiveStatusOfAllPages(): void {
        this._cache.getAllKnownPages()?.forEach((pageNode) => {
            pageNode.setActive(false)
        })
    }

    private notifyCurrentPageOfEvent(event: string, eventArgs: EventArgs) {
        const currentPage: IPageHistory | null = this.getCurrentPage()

        this.notifyPageNode(currentPage?.pageNode, event, eventArgs)
    }

    private notifyPageNode(page: IPageNode, event: string, eventArgs: EventArgs) {
        if (page != null) {
            const nodeMsg = {
                topic: eventArgs.type,
                payload: { ...eventArgs },
            }

            // when hw buttons do not control power outputs translate to event
            if (
                this._panelConfig.panel.detachRelays &&
                eventArgs.type === 'hw' &&
                eventArgs.event === 'button' &&
                eventArgs.event2 === 'press'
            ) {
                nodeMsg.topic = NSPanelConstants.STR_MSG_TOPIC_EVENT
            }

            page.emit(event, nodeMsg)
        }
    }

    private notifyControllerNode(eventArgs: EventArgs) {
        const nodeMsg = {
            topic: eventArgs.type,
            payload: { ...eventArgs },
        }

        this.emit('event', nodeMsg)
    }

    private activateScreenSaver() {
        this._cache.resetHistory()

        const screenSaverPageNodes: IPageNode[] =
            this._cache.getAllKnownPages()?.filter((pageNode) => pageNode.isScreenSaver()) ?? []

        if (screenSaverPageNodes.length >= 1) {
            const firstScreenSaver: IPageNode = screenSaverPageNodes[0]
            const pageHistory: IPageHistory = {
                historyType: 'page',
                pageNode: firstScreenSaver,
            }
            this.setCurrentPage(pageHistory)

            if (screenSaverPageNodes.length >= 2) {
                log.warn(`More than one screensaver attached. Found ${screenSaverPageNodes.length}`)
                // eslint-disable-next-line prefer-const
                for (let i in screenSaverPageNodes) {
                    const node = screenSaverPageNodes[i]
                    if (node.id !== firstScreenSaver.id) {
                        node.setNodeStatus('warn', this._i18n('common.status.tooManyScreenSaver'))
                    }
                }
            }
        } else {
            this.setNodeStatus('warn', this._i18n('common.status.noScreenSaverPage'))
            log.warn('No screensaver found.')

            const hmiCmd: HMICommand = {
                cmd: NSPanelConstants.STR_LUI_CMD_PAGETYPE,
                params: NSPanelConstants.STR_PAGE_TYPE_CARD_SCREENSAVER,
            }
            this.sendToPanel(hmiCmd)
        }
    }

    private activateStartupPage() {
        const hmiCmd: HMICommand = {
            cmd: NSPanelConstants.STR_LUI_CMD_PAGETYPE,
            params: NSPanelConstants.STR_PAGE_TYPE_CARD_STARTUP,
        }
        this.sendToPanel(hmiCmd)
    }

    private updatePage(page: IPageNode) {
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

        this.sendToPanel(data)
    }

    private updatePopup(page: IPageNode, popupType: string, entityId: string) {
        const pageData = page.generatePopupDetails(popupType, entityId)
        if (pageData !== null) {
            this.sendToPanel(pageData)
        } else {
            // close popup, if it cannot be generated, thus is not supported yet
            this.onPopupClose()
        }
    }

    private updateNotification(history: IPageHistory) {
        const notifyHmiCmd = NSPanelPopupHelpers.generatePopupNotify(history.notifyData)

        if (notifyHmiCmd !== null) {
            const cmds: HMICommand[] = [
                { cmd: NSPanelConstants.STR_LUI_CMD_PAGETYPE, params: NSPanelConstants.STR_PAGE_TYPE_POPUP_NOTIFY },
                notifyHmiCmd,
            ]
            this.sendToPanel(cmds)

            if (this._ctrlConfig.beepOnNotifications || history.notifyData.beep) {
                this.sendBuzzerCommand(3, 2, 1)
            }
        }
    }

    private sendToPanel(cmds: HMICommand | HMICommand[] | null) {
        if (cmds == null || this._panelMqttHandler === null) return

        this._panelMqttHandler.sendToPanel(cmds)
    }

    private sendLWTToPanel() {
        const offline = this._i18n('nspanel-controller.panel.offline')
        const stopped = this._i18n('nspanel-controller.panel.serverStopped')

        const date = new Date()
        const timeHours = date.getHours()
        const timeMinutes = date.getMinutes()

        const timeStr = `${timeHours.toString().padStart(2, '0')}:${timeMinutes.toString().padStart(2, '0')}`

        const cmds: HMICommand[] = [
            { cmd: NSPanelConstants.STR_LUI_CMD_PAGETYPE, params: NSPanelConstants.STR_PAGE_TYPE_CARD_SCREENSAVER },
            { cmd: 'statusUpdate', params: null },
            { cmd: NSPanelConstants.STR_LUI_CMD_TIME, params: offline },
            { cmd: NSPanelConstants.STR_LUI_CMD_DATE, params: stopped },
            { cmd: NSPanelConstants.STR_LUI_CMD_NOTIFY, params: timeStr },
        ] // TODO: reattach relays?
        this.sendToPanel(cmds)
    }

    private sendCommandToPanel(cmd: TasmotaCommand) {
        this._panelMqttHandler?.sendCommandToPanel(cmd)
    }

    // #region basic panel commands
    private sendDetachRelays(detach: boolean = false) {
        const state = detach ? '1' : '0'

        this.sendCommandToPanel({ cmd: NSPanelConstants.STR_TASMOTA_CMD_DETACH_RELAYS, data: state })
    }

    private sendTelePeriod(telePeriod: number = 1) {
        const telePeriodStr = `${telePeriod}`
        this.sendCommandToPanel({ cmd: NSPanelConstants.STR_TASMOTA_CMD_TELEPERIOD, data: telePeriodStr })
    }

    private sendTimeToPanel() {
        const useCustomDate = this._panelConfig.panel.useCustomDateTimeFormat
        let timeStr: string

        if (useCustomDate === true) {
            timeStr = dayjs().format(this._panelConfig.panel.timeCustomFormat)
        } else {
            const timeOptions: Intl.DateTimeFormatOptions = { ...DEFAULT_TIME_OPTIONS }
            const date = new Date()

            try {
                if (this._panelConfig.panel.timeFormatHour != null)
                    timeOptions.hour = this._panelConfig.panel.timeFormatHour
                if (this._panelConfig.panel.dateFormatMonth != null)
                    timeOptions.minute = this._panelConfig.panel.timeFormatMinute

                timeStr = date.toLocaleTimeString(undefined, timeOptions)
            } catch {
                log.error('Invalid time format configuration, using default settings')
                timeStr = date.toLocaleTimeString(undefined, DEFAULT_TIME_OPTIONS)
            }
        }

        const hmiCmd: HMICommand = {
            cmd: NSPanelConstants.STR_LUI_CMD_TIME,
            params: timeStr,
        }
        this.sendToPanel(hmiCmd)
    }

    private sendDateToPanel() {
        const useCustomDate = this._panelConfig.panel.useCustomDateTimeFormat
        let dateStr: string

        if (useCustomDate === true) {
            dateStr = dayjs().format(this._panelConfig.panel.dateCustomFormat)
        } else {
            const dateOptions: Intl.DateTimeFormatOptions = { ...DEFAULT_DATE_OPTIONS }
            const date = new Date()

            try {
                if (this._panelConfig.panel.dateFormatYear != null)
                    dateOptions.year = this._panelConfig.panel.dateFormatYear
                if (this._panelConfig.panel.dateFormatMonth != null)
                    dateOptions.month = this._panelConfig.panel.dateFormatMonth
                if (this._panelConfig.panel.dateFormatDay != null)
                    dateOptions.day = this._panelConfig.panel.dateFormatDay
                if (this._panelConfig.panel.dateFormatWeekday != null)
                    dateOptions.weekday = this._panelConfig.panel.dateFormatWeekday

                dateStr = date.toLocaleDateString(undefined, dateOptions)
            } catch {
                log.error('Invalid date format configuration, using default settings')
                dateStr = date.toLocaleDateString(undefined, DEFAULT_DATE_OPTIONS)
            }
        }

        const hmiCmd: HMICommand = {
            cmd: NSPanelConstants.STR_LUI_CMD_DATE,
            params: dateStr,
        }
        this.sendToPanel(hmiCmd)
    }

    private sendDimModeToPanel() {
        // TODO: could panelDimLow/high be empty
        const dimLow = this._panelDimModes.isNight
            ? this._panelConfig.panel.panelDimLowNight
            : this._panelConfig.panel.panelDimLow
        const dimHigh = this._panelDimModes.isNight
            ? this._panelConfig.panel.panelDimHighNight
            : this._panelConfig.panel.panelDimHigh

        const hmiCmd: HMICommand = {
            cmd: NSPanelConstants.STR_LUI_CMD_DIMMODE,
            params: [dimLow, dimHigh],
        }

        this.sendToPanel(hmiCmd)
    }

    private sendTimeoutToPanel(timeout: number | null = null) {
        const tempTimeout = timeout === null ? this._panelConfig.panel.panelTimeout : timeout
        const hmiCmd: HMICommand = {
            cmd: NSPanelConstants.STR_LUI_CMD_TIMEOUT,
            params: tempTimeout,
        }
        this.sendToPanel(hmiCmd)
    }
    // #endregion basic panel commands

    // #region cron jobs
    private cronTaskEveryMinute: CronosTask | null = null

    private cronTaskHourly: CronosTask = null

    private cronTaskDimModeDay: CronosTask = null

    private cronTaskDimModeNight: CronosTask = null

    private cronTaskCheckForUpdates: CronosTask = null

    private onCronEveryMinute() {
        try {
            this.sendTimeToPanel()
        } catch (err: unknown) {
            if (err instanceof Error) {
                log.error(`Error executing minutely cron: ${err.message}`)
            }
        }
    }

    private onCronHourly() {
        try {
            this.sendDateToPanel()
            this.emit('cron:hourly')
        } catch (err: unknown) {
            if (err instanceof Error) {
                log.error(`Error executing hourly cron: ${err.message}`)
            }
        }
    }

    private onCronCheckForUpdates() {
        try {
            this._panelUpdater.checkForUpdates()
        } catch (err: unknown) {
            if (err instanceof Error) {
                log.error(`Error executing check for updates: ${err.message}`)
            }
        }
    }
    // #endregion cron jobs
}
