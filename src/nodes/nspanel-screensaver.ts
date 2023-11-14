/* eslint-disable import/no-import-module-exports */
import { ScreenSaverNodeBase } from '../lib/screensaver-node-base'
import { NSPanelUtils } from '../lib/nspanel-utils'
import { NSPanelColorUtils } from '../lib/nspanel-colorutils'
import { HMICommand, HMICommandParameters, PageData, PanelColor, ScreenSaverBaseConfig } from '../types/types'
import * as NSPanelConstants from '../lib/nspanel-constants'

type ScreenSaverConfig = ScreenSaverBaseConfig & {
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

const CMD_WEATHERUPDATE: string = 'weatherUpdate'
const DEFAULT_LUI_BACKGROUND = NSPanelConstants.STR_LUI_COLOR_BLACK
const DEFAULT_LUI_FOREGROUND = NSPanelConstants.STR_LUI_COLOR_WHITE

module.exports = (RED) => {
    class ScreenSaverPageNode extends ScreenSaverNodeBase<ScreenSaverConfig> {
        constructor(config: ScreenSaverConfig) {
            super(config, RED, { pageType: NSPanelConstants.STR_PAGE_TYPE_CARD_SCREENSAVER, maxEntities: MAX_ENTITIES })
        }

        public override generatePage(): HMICommand | HMICommand[] | null {
            const result: HMICommand[] = []

            const statusUpdate: HMICommand = this.generateStatusUpdate()
            if (statusUpdate) result.push(statusUpdate)

            const weatherUpdate: HMICommand = this.generateWeatherUpdate()
            if (weatherUpdate) result.push(weatherUpdate)

            const colorSet: HMICommand = this.generateColorCommand()
            if (colorSet) result.push(colorSet)

            return result
        }

        private generateWeatherUpdate(): HMICommand {
            const pageData: PageData = this.getPageData()
            if (pageData.entities.length === 0) {
                return null
            }

            const hmiCmdParams: HMICommandParameters = []
            const data = pageData.entities

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
                hmiCmdParams.push(entity)
            }

            const hmiCmd: HMICommand = {
                cmd: CMD_WEATHERUPDATE,
                params: hmiCmdParams,
            }

            return hmiCmd
        }

        private generateColorCommand(): HMICommand {
            const config: ScreenSaverConfig = this.getConfig()

            const colorBackground = NSPanelColorUtils.toHmiColor(config?.colorBackground, DEFAULT_LUI_BACKGROUND)
            const colorTime = NSPanelColorUtils.toHmiColor(config?.colorTime, DEFAULT_LUI_FOREGROUND)
            const colorTimeAmPm = NSPanelColorUtils.toHmiColor(config?.colorTimeAmPm, DEFAULT_LUI_FOREGROUND)
            const colorDate = NSPanelColorUtils.toHmiColor(config?.colorDate, DEFAULT_LUI_FOREGROUND)
            const colorMainText = NSPanelColorUtils.toHmiColor(config?.colorMainText, DEFAULT_LUI_FOREGROUND)
            const colorForecast1 = NSPanelColorUtils.toHmiColor(config?.colorForecast1, DEFAULT_LUI_FOREGROUND)
            const colorForecast2 = NSPanelColorUtils.toHmiColor(config?.colorForecast2, DEFAULT_LUI_FOREGROUND)
            const colorForecast3 = NSPanelColorUtils.toHmiColor(config?.colorForecast3, DEFAULT_LUI_FOREGROUND)
            const colorForecast4 = NSPanelColorUtils.toHmiColor(config?.colorForecast4, DEFAULT_LUI_FOREGROUND)
            const colorForecastVal1 = NSPanelColorUtils.toHmiColor(config?.colorForecastVal1, DEFAULT_LUI_FOREGROUND)
            const colorForecastVal2 = NSPanelColorUtils.toHmiColor(config?.colorForecastVal2, DEFAULT_LUI_FOREGROUND)
            const colorForecastVal3 = NSPanelColorUtils.toHmiColor(config?.colorForecastVal3, DEFAULT_LUI_FOREGROUND)
            const colorForecastVal4 = NSPanelColorUtils.toHmiColor(config?.colorForecastVal4, DEFAULT_LUI_FOREGROUND)
            const colorBar = NSPanelColorUtils.toHmiColor(config?.colorBar, DEFAULT_LUI_FOREGROUND)
            const colorMainTextAlt2 = NSPanelColorUtils.toHmiColor(config?.colorMainTextAlt2, DEFAULT_LUI_FOREGROUND)
            const colorTimeAdd = NSPanelColorUtils.toHmiColor(config?.colorTimeAdd, DEFAULT_LUI_FOREGROUND)

            const result: HMICommandParameters = []
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

            const hmiCmd: HMICommand = {
                cmd: CMD_COLOR,
                params: result,
            }

            return hmiCmd
        }
    }

    RED.nodes.registerType('nspanel-screensaver', ScreenSaverPageNode)
}
