import * as nEvents from 'events'

import { NSPanelUtils } from './nspanel-utils'
import { NSPanelDateUtils } from './nspanel-date-utils'
import { NSPanelMqttHandler } from './nspanel-mqtt-handler'
import { NSPanelCommandHandler } from './nspanel-command-handler'

import {
    CommandData,
    IPageNode,
    IPanelCommandHandler,
    IPanelController,
    IPanelMqttHandler,
    IPanelNodeEx,
    NotifyData,
    PageMap,
    PanelConfig,
    PanelControllerConfig,
    RegionalSettings,
} from '../types/types'
import * as NSPanelConstants from './nspanel-constants'

export abstract class AbstractNSPanelController extends nEvents.EventEmitter implements IPanelController {
    private _ctrlConfig: PanelControllerConfig

    private _panelNode: IPanelNodeEx

    private _panelConfig: PanelConfig

    private _dateLocale: string

    private _regionSettings: RegionalSettings

    private _panelMqttHandler: IPanelMqttHandler

    private _commandHandler: IPanelCommandHandler

    constructor(config: PanelControllerConfig, panelNode: IPanelNodeEx) {
        super()

        this._ctrlConfig = config
        this._panelNode = panelNode
    }

    public dispose(): void {
        this._panelMqttHandler.dispose()
    }

    protected getConfig(): PanelControllerConfig {
        return this._ctrlConfig
    }

    protected getPanelConfig(): PanelConfig {
        if (this._panelConfig == null) {
            this._panelConfig = this._panelNode?.getPanelConfig()
        }

        return this._panelConfig
    }

    protected getCommandHandler(): IPanelCommandHandler {
        if (this._commandHandler == null) {
            const mqttHandler = this.getMqttHandler()
            const cmdHandler = new NSPanelCommandHandler(mqttHandler, {
                defaultTimeout: this.getPanelConfig().panel.panelTimeout,
            })

            this._commandHandler = cmdHandler
        }

        return this._commandHandler
    }

    protected getMqttHandler(): IPanelMqttHandler {
        if (this._panelMqttHandler == null) {
            const panelConfig = this._panelNode.getPanelConfig()
            const mqttHandler = new NSPanelMqttHandler(panelConfig)
            this._panelMqttHandler = mqttHandler
        }

        return this._panelMqttHandler
    }

    // #region basic hmi commands
    protected sendTimeToPanel() {
        const localeConfig = this.getRegionSettings()

        const date = new Date()
        const amPmStr: string = date.getHours() >= 12 ? NSPanelConstants.STR_TIME_PM : NSPanelConstants.STR_TIME_AM

        let timeStr: string
        if (localeConfig.useCustomDate === true) {
            timeStr = NSPanelDateUtils.format(date, localeConfig.timeCustomFormat, localeConfig.locale)
        } else {
            timeStr = NSPanelDateUtils.formatTime(
                date,
                localeConfig.locale,
                localeConfig.timeFormatHour,
                localeConfig.timeFormatMinute,
                localeConfig.use12HourClock
            )
        }

        if (localeConfig.use12HourClock && localeConfig.timeFormatShowAmPm) {
            timeStr += `   ?${amPmStr}`
        }

        this.getCommandHandler()?.sendTimeToPanel(timeStr)
    }

    protected sendDateToPanel() {
        const regionSettings = this.getRegionSettings()

        const useCustomDate = regionSettings.useCustomDateTimeFormat
        const date = new Date()
        let dateStr: string

        if (useCustomDate === true) {
            dateStr = NSPanelDateUtils.format(date, regionSettings.dateCustomFormat, regionSettings.locale)
        } else {
            dateStr = NSPanelDateUtils.formatDate(
                date,
                regionSettings.locale,
                regionSettings.dateFormatYear,
                regionSettings.dateFormatMonth,
                regionSettings.dateFormatDay,
                regionSettings.dateFormatWeekday
            )
        }

        this.getCommandHandler()?.sendDateToPanel(dateStr)
    }
    // #endregion basic hmi commands

    // #region locale and region settings

    protected setLocale(locale: string): void {
        const sysLocale = Intl.DateTimeFormat().resolvedOptions().locale
        const dateLocale = NSPanelUtils.isStringNullOrEmpty(locale) ? sysLocale : locale

        NSPanelDateUtils.setGlobalLocale(dateLocale)
        this._dateLocale = dateLocale?.toLowerCase() ?? NSPanelConstants.DEFAULT_DATE_LOCALE
    }

    protected getLocale(): string {
        return this._dateLocale
    }

    protected getRegionSettings(): RegionalSettings {
        if (this._regionSettings == null) {
            const locale = this.getLocale()
            const panelConfig = this.getPanelConfig()

            this._regionSettings = {
                locale,
                useCustomDate: panelConfig.panel.useCustomDateTimeFormat,
                useCustomDateTimeFormat: panelConfig.panel.useCustomDateTimeFormat,

                timeFormatShowAmPm: panelConfig.panel.timeFormatShowAmPm,
                use12HourClock: panelConfig.panel.timeFormatTimeNotation === '12',

                timeCustomFormat: panelConfig.panel.timeCustomFormat,
                timeFormatHour: panelConfig.panel.timeFormatHour,
                timeFormatMinute: panelConfig.panel.timeFormatMinute,

                dateCustomFormat: panelConfig.panel.dateCustomFormat,
                dateFormatYear: panelConfig.panel.dateFormatYear,
                dateFormatMonth: panelConfig.panel.dateFormatMonth,
                dateFormatDay: panelConfig.panel.dateFormatDay,
                dateFormatWeekday: panelConfig.panel.dateFormatWeekday,
            }
        }

        return this._regionSettings
    }
    // #endregion locale and region settings

    // #region flow awareness
    private _delayPanelStartupFlag = true

    protected getPanelStartupDelayFlag(): boolean {
        return this._delayPanelStartupFlag
    }

    public onFlowsStarting(): void {
        this._delayPanelStartupFlag = true
    }

    public onFlowsStarted(): void {
        this._delayPanelStartupFlag = false
    }
    // #endregion

    public abstract registerPages(pages: PageMap): void
    public abstract registerPage(page: IPageNode): void
    public abstract deregisterPage(page: IPageNode): void

    public abstract executeCommand(command: CommandData | CommandData[]): void
    public abstract showNotification(notifyData: NotifyData): void
}
