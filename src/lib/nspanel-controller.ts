import { scheduleTask, CronosTask } from 'cronosjs'

import { Logger } from './logger'
import { AbstractNSPanelController } from './abstract-nspanel-controller'
import { NSPanelPageHandler } from './nspanel-page-handler'
import { NSPanelUpdater } from './nspanel-updater'

import {
    EventArgs,
    SplitTime,
    PageMap,
    IPageNode,
    PageId,
    NodeRedI18nResolver,
    IPanelUpdater,
    StartupEventArgs,
    CommandData,
    IPageHistory,
    FirmwareEventArgs,
    StatusLevel,
    NodeStatus,
    PanelControllerConfig,
    HMICommand,
    IPanelNodeEx,
    IPageHandler,
    IStatus,
    StatusCode,
    NotifyData,
} from '../types/types'
import * as NSPanelConstants from './nspanel-constants'

const log = Logger('NSPanelController')

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

export class NSPanelController extends AbstractNSPanelController {
    private _panelUpdater: IPanelUpdater

    private _pageHandler: IPageHandler

    private _i18n: NodeRedI18nResolver

    private _panelDimModes: PanelDimModes = {
        isNight: false,
        day: { isConfigured: false, dimLow: 100, dimHigh: 100, start: { hours: 0, minutes: 0 } },
        night: { isConfigured: false, dimLow: 100, dimHigh: 100, start: { hours: 0, minutes: 0 } },
    }

    constructor(ctrlConfig: PanelControllerConfig, panelNode: IPanelNodeEx, i18n: NodeRedI18nResolver) {
        super(ctrlConfig, panelNode)
        this._i18n = i18n

        this.init()
    }

    public onPageIdNavigationRequest(pageId: PageId): void {
        this.getPageHandler()?.onPageIdNavigationRequest(pageId)
    }

    registerPages(pages: PageMap) {
        // eslint-disable-next-line prefer-const
        for (let i in pages) {
            this.registerPage(pages[i])
        }
    }

    registerPage(page: IPageNode) {
        this.getPageHandler()?.registerPage(page)
    }

    deregisterPage(page: IPageNode) {
        this.getPageHandler()?.deregisterPage(page)
    }

    public executeCommand(commands: CommandData | CommandData[]) {
        const cmds: CommandData[] = Array.isArray(commands) ? commands : [commands]

        cmds.forEach((cmdData) => {
            switch (cmdData.cmd) {
                case 'checkForUpdates': {
                    this._panelUpdater?.checkForUpdates()
                    break
                }

                default:
                    this.getCommandHandler()?.executeCommand(cmdData)
            }
        })
    }

    public setNodeStatus(statusLevel: StatusLevel, msg: string): void {
        const nodeStatus: NodeStatus = { statusLevel, msg }
        this.emit('status', nodeStatus)
    }

    public dispose() {
        this.sendLWTToPanel()
        this.cronTaskEveryMinute?.stop()
        this.cronTaskHourly?.stop()
        this.cronTaskDimModeDay?.stop()
        this.cronTaskDimModeNight?.stop()
        this.cronTaskCheckForUpdates?.stop()
        this._panelUpdater?.dispose()
        super.dispose()
    }

    private init() {
        const panelConfig = this.getPanelConfig()

        log.info(`Starting panel controller for panel ${panelConfig.panel.topic}`)

        this.setLocale(panelConfig.panel.dateLanguage)

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
        const mqttHandler = this.getMqttHandler()
        if (mqttHandler != null) {
            mqttHandler.on('event', (eventArgs) => this.onEvent(eventArgs))
            mqttHandler.on('msg', (msg) => this.onMessage(msg))
            mqttHandler.on('sensor', (msg) => this.onSensorData(msg))
        }

        // initialize page handling
        const pageHandler = new NSPanelPageHandler(this.getCommandHandler(), {
            beepOnNotifications: this.getConfig().beepOnNotifications,
        })
        this._pageHandler = pageHandler

        // initialize updater
        const panelUpdater = new NSPanelUpdater(this, mqttHandler, this._i18n, {
            panelNodeTopic: panelConfig.panel.topic,
            autoUpdate: panelConfig.panel.autoUpdate,
            tasmotaOtaUrl: panelConfig.panel.tasmotaOtaUrl,
        })
        panelUpdater.on('update', (fwEventArgs: FirmwareEventArgs) => this.onUpdateEvent(fwEventArgs))
        this._panelUpdater = panelUpdater

        // notify controller node about state
        this.setNodeStatus('info', this._i18n('common.status.waitForPages'))
        pageHandler?.activateStartupPage()
    }

    private onEvent(eventArgs: EventArgs) {
        switch (eventArgs.event) {
            case NSPanelConstants.STR_LUI_EVENT_STARTUP: {
                this.getPageHandler()?.clearActiveStatusOfAllPages()
                const startupEventArgs: StartupEventArgs = eventArgs as StartupEventArgs
                this.onPanelStartup(startupEventArgs)
                this.notifyControllerNode(eventArgs)
                break
            }

            case NSPanelConstants.STR_LUI_EVENT_SLEEPREACHED:
                this.activateScreenSaver() // TODO: last notification, if applicable
                this.notifyControllerNode(eventArgs)
                break

            case 'relay': {
                if (eventArgs.type === 'hw') {
                    this.notifyControllerNode(eventArgs)
                }
                const currentPage: IPageHistory | null = this.getPageHandler()?.getCurrentPage()
                let currentPageIncluded: boolean = false

                // send relay state to page nodes requesting relay states
                const pageNodesNeedingRelayStates: IPageNode[] =
                    this.getPageHandler()
                        ?.getAllKnownPages()
                        ?.filter((pageNode) => pageNode.needsRelayStates() === true) ?? []
                if (pageNodesNeedingRelayStates.length >= 1) {
                    for (const pageNode of pageNodesNeedingRelayStates) {
                        this.notifyPageNode(pageNode, 'input', eventArgs)
                        if (pageNode.id === currentPage?.pageNode?.id) {
                            currentPageIncluded = true
                        }
                    }
                }
                if (!currentPageIncluded) {
                    this.notifyCurrentPageOfEvent('input', eventArgs)
                }
                break
            }

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
                // log.debug(`UNCATCHED onEvent default ${JSON.stringify(eventArgs)}`)
                // dispatch to active page
                this.notifyCurrentPageOfEvent('input', eventArgs)
        }
    }

    private onMessage(msg: EventArgs) {
        if (msg.type === 'fw') {
            const fwEventArgs: FirmwareEventArgs = msg as FirmwareEventArgs
            this._panelUpdater?.onFirmwareEvent(fwEventArgs)
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

        // send sensor data to pages requesting sensor data
        const pageNodesNeedingSensorData: IPageNode[] =
            this.getPageHandler()
                ?.getAllKnownPages()
                ?.filter((pageNode) => pageNode.needsSensorData() === true) ?? []
        if (pageNodesNeedingSensorData.length >= 1) {
            for (const pageNode of pageNodesNeedingSensorData) {
                this.notifyPageNode(pageNode, 'input', eventArgs)
            }
        }
    }

    private onPanelStartup(startupEventArgs: StartupEventArgs) {
        const panelConfig = this.getPanelConfig()

        // delay startup until pages had time to register
        if (this.getPanelStartupDelayFlag()) return
        this.getPageHandler()?.resetHistory()

        this._panelUpdater?.setHmiVersion(startupEventArgs.hmiVersion)
        this.setNodeStatus('info', this._i18n('common.status.panelInit'))

        // prepare dim mode
        const now: Date = new Date()
        const dimModeNightStart = new Date()
        dimModeNightStart.setHours(this._panelDimModes.night.start.hours, this._panelDimModes.night.start.minutes, 0, 0)
        if (now >= dimModeNightStart) {
            this._panelDimModes.isNight = true
        }

        this.getCommandHandler()?.sendTimeoutToPanel()
        this.sendDimModeToPanel()
        this.sendTimeToPanel()
        this.sendDateToPanel()
        this.sendTelePeriod(panelConfig.panel.telePeriod)
        this.configureRelays(panelConfig.panel.detachRelays)

        this.scheduleTasks()

        if (this.getConfig().screenSaverOnStartup) {
            this.activateScreenSaver()
        }
        this.setNodeStatus('info', this._i18n('common.status.panelStarted'))
    }

    private scheduleTasks(): void {
        const panelConfig = this.getPanelConfig()

        if (this.cronTaskHourly === null) {
            this.cronTaskHourly = scheduleTask('@hourly', () => this.onCronHourly(), {})
        }
        if (this.cronTaskEveryMinute === null) {
            this.cronTaskEveryMinute = scheduleTask('0 */1 * * * *', () => this.onCronEveryMinute(), {})
        }

        if (panelConfig.panel.enableUpdates && this.cronTaskCheckForUpdates == null) {
            const checkForUpdatesMinutes = panelConfig.panel.timeToCheckForUpdates.minutes
            const checkForUpdatesHours = panelConfig.panel.timeToCheckForUpdates.hours

            if (Number.isNaN(checkForUpdatesHours) || Number.isNaN(checkForUpdatesMinutes)) {
                log.error(`Invalid update time specified: ${checkForUpdatesHours}:${checkForUpdatesMinutes}`)
            } else {
                try {
                    this.cronTaskCheckForUpdates = scheduleTask(
                        `0 ${checkForUpdatesMinutes} ${checkForUpdatesHours} * * *`,
                        () => this.onCronCheckForUpdates(),
                        {}
                    )
                } catch (err: unknown) {
                    if (err instanceof Error) {
                        log.error(`Error scheduling update task: ${err.message}`)
                    }
                }
            }
        }

        if (this.cronTaskDimModeDay === null && this._panelDimModes.day.isConfigured) {
            const dayStartMinutes = this._panelDimModes.day.start.minutes
            const dayStartHours = this._panelDimModes.day.start.hours
            if (Number.isNaN(dayStartHours) || Number.isNaN(dayStartMinutes)) {
                log.error(`Invalid day start time specified for dim mode: ${dayStartHours}:${dayStartMinutes}`)
            } else {
                try {
                    this.cronTaskDimModeDay = scheduleTask(
                        `0 ${dayStartHours} ${dayStartHours} * * *`,
                        () => {
                            this._panelDimModes.isNight = false
                            this.sendDimModeToPanel()
                        },
                        {}
                    )
                } catch (err: unknown) {
                    if (err instanceof Error) {
                        log.error(`Error scheduling panel dim mode day task: ${err.message}`)
                    }
                }
            }
        }
        if (this.cronTaskDimModeNight === null && this._panelDimModes.night.isConfigured) {
            const nightStartMinutes = this._panelDimModes.night.start.minutes
            const nightStartHours = this._panelDimModes.night.start.hours

            if (Number.isNaN(nightStartHours) || Number.isNaN(nightStartMinutes)) {
                log.error(`Invalid night start time specified for dim mode: ${nightStartHours}:${nightStartMinutes}`)
            } else {
                try {
                    this.cronTaskDimModeNight = scheduleTask(
                        `0 ${nightStartMinutes} ${nightStartHours} * * *`,
                        () => {
                            this._panelDimModes.isNight = true
                            this.sendDimModeToPanel()
                        },
                        {}
                    )
                } catch (err: unknown) {
                    if (err instanceof Error) {
                        log.error(`Error scheduling panel dim mode night task: ${err.message}`)
                    }
                }
            }
        }
    }

    public showNotification(notifyData: NotifyData): void {
        this.getPageHandler()?.showNotification(notifyData)
    }

    private onPopupOpen(eventArgs: EventArgs) {
        this.getPageHandler().showPopup(eventArgs.source, eventArgs.entityId)
    }

    private onPopupClose() {
        this.getPageHandler()?.closePopup()
    }

    private notifyCurrentPageOfEvent(event: string, eventArgs: EventArgs) {
        const currentPage = this.getPageHandler()?.getCurrentPage()
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
                this.getPanelConfig().panel.detachRelays &&
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
        const result: IStatus = this.getPageHandler().activateScreenSaver()

        switch (result.getStatus()) {
            case StatusCode.WARNING: {
                this.setNodeStatus('warn', this._i18n('common.status.tooManyScreenSaver'))
                log.warn(result.getMessage())
                break
            }

            case StatusCode.ERROR: {
                this.setNodeStatus('warn', this._i18n('common.status.noScreenSaverPage'))
                log.warn(result.getMessage())
                break
            }
        }
    }

    private sendLWTToPanel() {
        const offline = this._i18n('nspanel-controller.panel.offline')
        const stopped = this._i18n('nspanel-controller.panel.serverStopped')

        const date = new Date()
        const timeHours = date.getHours()
        const timeMinutes = date.getMinutes()

        const timeStr = ` ${timeHours.toString().padStart(2, '0')}:${timeMinutes.toString().padStart(2, '0')}`

        const cmds: HMICommand[] = [
            { cmd: NSPanelConstants.STR_LUI_CMD_PAGETYPE, params: NSPanelConstants.STR_PAGE_TYPE_CARD_SCREENSAVER },
            { cmd: 'statusUpdate', params: null },
            { cmd: NSPanelConstants.STR_LUI_CMD_TIME, params: offline },
            { cmd: NSPanelConstants.STR_LUI_CMD_DATE, params: stopped + timeStr },
            //{ cmd: NSPanelConstants.STR_LUI_CMD_NOTIFY, params: timeStr },
        ] // TODO: reattach relays?
        this.getCommandHandler()?.sendHMICommand(cmds)
    }

    private configureRelays(detach: boolean = false) {
        // TODO: move to command handler
        const state = detach ? '1' : '0'
        this.getCommandHandler()?.sendTasmotaCommand({
            cmd: NSPanelConstants.STR_TASMOTA_CMD_DETACH_RELAYS,
            data: state,
        })

        // query relay states
        this.executeCommand([
            { cmd: 'switch', params: { id: 0 } },
            { cmd: 'switch', params: { id: 1 } },
        ])
    }

    // #region basic panel commands
    private sendTelePeriod(telePeriod: number = 1) {
        // TODO: move to command handler
        const telePeriodStr = `${telePeriod}`
        this.getCommandHandler()?.sendTasmotaCommand({
            cmd: NSPanelConstants.STR_TASMOTA_CMD_TELEPERIOD,
            data: telePeriodStr,
        })
    }

    private sendDimModeToPanel() {
        // TODO: move to command handler
        const panelConfig = this.getPanelConfig()
        // TODO: could panelDimLow/high be empty
        const dimLow = this._panelDimModes.isNight ? panelConfig.panel.panelDimLowNight : panelConfig.panel.panelDimLow
        const dimHigh = this._panelDimModes.isNight
            ? panelConfig.panel.panelDimHighNight
            : panelConfig.panel.panelDimHigh

        const hmiCmd: HMICommand = {
            cmd: NSPanelConstants.STR_LUI_CMD_DIMMODE,
            params: [dimLow, dimHigh],
        }

        this.getCommandHandler()?.sendHMICommand(hmiCmd)
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

    protected getPageHandler(): IPageHandler {
        return this._pageHandler
    }
}
