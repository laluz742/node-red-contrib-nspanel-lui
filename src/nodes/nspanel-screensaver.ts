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

module.exports = (RED) => {
    class ScreenSaverNode extends PageNode<ScreenSaverConfig> {
        private config: ScreenSaverConfig

        protected statusData: StatusItemData[] = []

        constructor(config: ScreenSaverConfig) {
            super(config, RED, { pageType: 'screensaver', maxEntities: MAX_ENTITIES })

            this.config = config
        }

        public isScreenSaver(): boolean {
            return true
        }

        protected override handleInput(msg: PageInputMessage, _send: NodeRedSendCallback): boolean {
            if (!NSPanelMessageUtils.hasProperty(msg, 'topic')) return false

            switch (msg.topic) {
                case 'status':
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

            let cmd = `statusUpdate${NSPanelConstants.STR_LUI_DELIMITER}`
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

            let result = `weatherUpdate${NSPanelConstants.STR_LUI_DELIMITER}`
            const resultEntities: string[] = []
            const data = this.pageData.entities

            // eslint-disable-next-line prefer-const
            for (let i in data) {
                const item = data[i]
                const entity = NSPanelUtils.makeEntity(
                    '',
                    '',
                    NSPanelUtils.getIcon(item.icon),
                    NSPanelColorUtils.toHmiIconColor(item.iconColor ?? NaN),
                    item.text,
                    item.value
                )
                resultEntities.push(entity)
            }

            result += resultEntities.join(NSPanelConstants.STR_LUI_DELIMITER)
            return result
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
