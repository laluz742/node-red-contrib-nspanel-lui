/* eslint-disable import/no-import-module-exports */
import { PageNode } from '../lib/page-node'
import { NSPanelUtils } from '../lib/nspanel-utils'
import { NSPanelMessageUtils } from '../lib/nspanel-message-utils'
import { NSPanelColorUtils } from '../lib/nspanel-colorutils'
import {
    EventArgs,
    EventMapping,
    PageConfig,
    NodeRedSendCallback,
    PageInputMessage,
    StatusItemData,
    PanelColor,
} from '../types/types'
import * as NSPanelConstants from '../lib/nspanel-constants'

type ScreenSaverConfig = PageConfig & {
    doubleTapToExit: boolean

    colorBackground?: PanelColor
    colorTime?: PanelColor
    colorTimeAmPm?: PanelColor
    colorDate?: PanelColor
    colorMainText?: PanelColor
    colorForecast1?: PanelColor
    colorForecast2?: PanelColor
    colorForecast3?: PanelColor
    colorForecast4?: PanelColor
    colorForecastVal1?: PanelColor
    colorForecastVal2?: PanelColor
    colorForecastVal3?: PanelColor
    colorForecastVal4?: PanelColor
    colorBar?: PanelColor
    colorMainTextAlt2?: PanelColor
    colorTimeAdd?: PanelColor
}

const MAX_ENTITIES = 6
const CMD_COLOR: string = 'color'
const CMD_STATUSUPDATE: string = 'statusUpdate'
const CMD_WEATHERUPDATE: string = 'weatherUpdate'
const DEFAULT_LUI_BACKGROUND = NSPanelConstants.STR_LUI_COLOR_BLACK
const DEFAULT_LUI_FOREGROUND = NSPanelConstants.STR_LUI_COLOR_WHITE

module.exports = (RED) => {
    class ScreenSaverNode extends PageNode<ScreenSaverConfig> {
        private config: ScreenSaverConfig

        protected statusData: StatusItemData[] = []

        constructor(config: ScreenSaverConfig) {
            super(config, RED, { pageType: NSPanelConstants.STR_PAGE_TYPE_CARD_SCREENSAVER, maxEntities: MAX_ENTITIES })

            this.config = config
        }

        public isScreenSaver(): boolean {
            return true
        }

        protected override handleInput(msg: PageInputMessage, _send: NodeRedSendCallback): boolean {
            if (!NSPanelMessageUtils.hasProperty(msg, 'topic')) return false

            switch (msg.topic) {
                case NSPanelConstants.STR_MSG_TOPIC_STATUS:
                    this.handleStatusInput(msg)
                    this.requestUpdate()
                    return true
            }

            return false
        }

        public override generatePage(): string | string[] | null {
            const result: string[] = []

            const statusUpdate = this.generateStatusUpdate()
            if (statusUpdate) result.push(statusUpdate)

            const weatherUpdate = this.generateWeatherUpdate()
            if (weatherUpdate) result.push(weatherUpdate)

            const colorSet = this.generateColorCommand()
            if (colorSet) result.push(colorSet)

            return result
        }

        public prePageNavigationEvent(eventArgs: EventArgs, _eventConfig: EventMapping) {
            if (eventArgs.event2 === NSPanelConstants.STR_LUI_EVENT_BEXIT && this.config.doubleTapToExit) {
                return eventArgs.value ? eventArgs.value >= 2 : false
            }

            return true
        }

        private generateStatusUpdate() {
            if (this.statusData.length === 0) {
                return null
            }

            let cmd = `${CMD_STATUSUPDATE}${NSPanelConstants.STR_LUI_DELIMITER}`
            const cmdParams: string[] = []

            for (let idx = 0; idx < 2; idx += 1) {
                const item = this.statusData[idx]
                const tmp: string =
                    item != null
                        ? NSPanelUtils.makeIcon(
                              (item.prefix ?? '') + NSPanelUtils.getIcon(item.icon) + (item.text ?? ''),
                              item.iconColor
                          )
                        : NSPanelUtils.makeIcon(null, null)
                cmdParams.push(tmp)
            }
            cmd += cmdParams.join(NSPanelConstants.STR_LUI_DELIMITER)
            return cmd
        }

        private generateWeatherUpdate() {
            if (this.pageData.entities.length === 0) {
                return null
            }

            let result = `${CMD_WEATHERUPDATE}${NSPanelConstants.STR_LUI_DELIMITER}`
            const resultEntities: string[] = []
            const data = this.pageData.entities

            // eslint-disable-next-line prefer-const
            for (let i in data) {
                const item = data[i]
                const entity = NSPanelUtils.makeEntity(
                    '',
                    '',
                    NSPanelUtils.getIcon(item.icon),
                    NSPanelColorUtils.toHmiColor(item.iconColor ?? NaN),
                    item.text,
                    item.value
                )
                resultEntities.push(entity)
            }

            result += resultEntities.join(NSPanelConstants.STR_LUI_DELIMITER)
            return result
        }

        private generateColorCommand(): string {
            const result: (number | string)[] = [CMD_COLOR]

            const colorBackground = NSPanelColorUtils.toHmiColor(this.config?.colorBackground, DEFAULT_LUI_BACKGROUND)
            const colorTime = NSPanelColorUtils.toHmiColor(this.config?.colorTime, DEFAULT_LUI_FOREGROUND)
            const colorTimeAmPm = NSPanelColorUtils.toHmiColor(this.config?.colorTimeAmPm, DEFAULT_LUI_FOREGROUND)
            const colorDate = NSPanelColorUtils.toHmiColor(this.config?.colorDate, DEFAULT_LUI_FOREGROUND)
            const colorMainText = NSPanelColorUtils.toHmiColor(this.config?.colorMainText, DEFAULT_LUI_FOREGROUND)
            const colorForecast1 = NSPanelColorUtils.toHmiColor(this.config?.colorForecast1, DEFAULT_LUI_FOREGROUND)
            const colorForecast2 = NSPanelColorUtils.toHmiColor(this.config?.colorForecast2, DEFAULT_LUI_FOREGROUND)
            const colorForecast3 = NSPanelColorUtils.toHmiColor(this.config?.colorForecast3, DEFAULT_LUI_FOREGROUND)
            const colorForecast4 = NSPanelColorUtils.toHmiColor(this.config?.colorForecast4, DEFAULT_LUI_FOREGROUND)
            const colorForecastVal1 = NSPanelColorUtils.toHmiColor(
                this.config?.colorForecastVal1,
                DEFAULT_LUI_FOREGROUND
            )
            const colorForecastVal2 = NSPanelColorUtils.toHmiColor(
                this.config?.colorForecastVal2,
                DEFAULT_LUI_FOREGROUND
            )
            const colorForecastVal3 = NSPanelColorUtils.toHmiColor(
                this.config?.colorForecastVal3,
                DEFAULT_LUI_FOREGROUND
            )
            const colorForecastVal4 = NSPanelColorUtils.toHmiColor(
                this.config?.colorForecastVal4,
                DEFAULT_LUI_FOREGROUND
            )
            const colorBar = NSPanelColorUtils.toHmiColor(this.config?.colorBar, DEFAULT_LUI_FOREGROUND)
            const colorMainTextAlt2 = NSPanelColorUtils.toHmiColor(
                this.config?.colorMainTextAlt2,
                DEFAULT_LUI_FOREGROUND
            )
            const colorTimeAdd = NSPanelColorUtils.toHmiColor(this.config?.colorTimeAdd, DEFAULT_LUI_FOREGROUND)

            result.push(colorBackground)
            result.push(colorTime)
            result.push(colorTimeAmPm)
            result.push(colorDate)
            result.push(colorMainText)
            result.push(colorForecast1)
            result.push(colorForecast2)
            result.push(colorForecast3)
            result.push(colorForecast4)
            result.push(colorForecastVal1)
            result.push(colorForecastVal2)
            result.push(colorForecastVal3)
            result.push(colorForecastVal4)
            result.push(colorBar)
            result.push(colorMainTextAlt2)
            result.push(colorTimeAdd)

            const cmdResult = result.join(NSPanelConstants.STR_LUI_DELIMITER)

            return cmdResult
        }

        private handleStatusInput(msg: PageInputMessage): void {
            if (msg.payload === undefined) return

            // TODO: take msg.parts into account to allow to set specific status
            const statusInputData = msg.payload
            const statusItems: StatusItemData[] = this.statusData.map((item) => item)

            if (Array.isArray(statusInputData)) {
                for (let i = 0; i < 2; i += 1) {
                    if (statusInputData[i] != null) {
                        const item: StatusItemData = NSPanelMessageUtils.convertToStatusItemData(
                            statusInputData[i]
                        ) as StatusItemData
                        const idx = NSPanelMessageUtils.getPropertyOrDefault(item, 'index', i)
                        statusItems[idx] = item
                    }
                }
            } else if (statusInputData != null) {
                const item = NSPanelMessageUtils.convertToStatusItemData(statusInputData) as StatusItemData
                const idx = NSPanelMessageUtils.getPropertyOrDefault(item, 'index', 0)
                statusItems[idx] = item
            }

            this.statusData = statusItems
        }
    }

    RED.nodes.registerType('nspanel-screensaver', ScreenSaverNode)
}
