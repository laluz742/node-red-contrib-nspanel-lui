/* eslint-disable import/no-import-module-exports */
import { NodeBase } from '../lib/node-base'
import { OpenWeatherConverter } from '../lib/nspanel-integration-weather'
import {
    NodeMessageInFlow,
    NodeRedOnErrorCallback,
    NodeRedSendCallback,
    INodeConfig,
    WeatherConverter,
    PageEntityData,
    WeatherData,
    WeatherForecastHour,
    WeatherForecastDay,
} from '../types/types'
import * as NSPanelConstants from '../lib/nspanel-constants'
import { NSPanelDateUtils } from '../lib/nspanel-date-utils'
import { NSPanelUtils } from '../lib/nspanel-utils'

const FORECAST_TITLE_FORMAT_WEEKDAY = 'ddd'
const DEFAULT_DATE_OPTIONS: Intl.DateTimeFormatOptions = {
    month: 'numeric',
    day: 'numeric',
}

interface NSPanelWeatherAdapterConfig extends INodeConfig {
    weatherSource: string

    numberOfForecasts: number
    includeCurrentWeather: boolean
    forecastTitle: string
    forecastTitleToday: string
    forecastTitleCustomFormat: string
    forecastTemperatureDigits: number

    dateLanguage: string
}

module.exports = (RED) => {
    class NSPanelWeatherAdapter extends NodeBase<NSPanelWeatherAdapterConfig> {
        private config: NSPanelWeatherAdapterConfig = null

        private weatherConverter: WeatherConverter = null

        constructor(config: NSPanelWeatherAdapterConfig) {
            super(config, RED)

            this.init(config)

            this.on('close', (done: () => void) => this._onClose(done))
            this.on('input', (msg: NodeMessageInFlow, send: NodeRedSendCallback, done: NodeRedOnErrorCallback) =>
                this._onDataInput(msg, send, done)
            )
        }

        private init(config: NSPanelWeatherAdapterConfig): void {
            this.config = config

            switch (config?.weatherSource) {
                case NSPanelConstants.WEATHER_SOURCE_OWM:
                default:
                    this.weatherConverter = new OpenWeatherConverter()
                    break
            }
        }

        private _onDataInput(msg: NodeMessageInFlow, send: NodeRedSendCallback, done: NodeRedOnErrorCallback) {
            if (msg != null) {
                const weatherData = this.prepareWeatherForecast(msg)

                if (weatherData != null) {
                    const newMsg = {
                        topic: NSPanelConstants.STR_MSG_TOPIC_DATA,
                        payload: weatherData,
                    }
                    send(newMsg)
                }
            }
            done()
        }

        private prepareWeatherForecast(msg: NodeMessageInFlow): PageEntityData[] {
            const result: PageEntityData[] = []
            const forecastTitle = this.config?.forecastTitle || NSPanelConstants.DEFAULT_FORECAST_TITLE

            const weatherData: WeatherData = this.weatherConverter?.convert(msg)
            let forecastCount = this.config?.numberOfForecasts || NSPanelConstants.DEFAULT_FORECAST_COUNT

            if (weatherData != null) {
                if (this.config?.includeCurrentWeather || false) {
                    const current = this.convertToPageEntityData(weatherData.current, forecastTitle)
                    if (current != null) {
                        forecastCount -= 1
                        result.push(current)
                    }
                }

                for (let i = 0; i < forecastCount && i < weatherData.daily?.length; i += 1) {
                    const entity = this.convertToPageEntityData(weatherData.daily[i], forecastTitle)
                    result.push(entity)
                }
            }

            return result
        }

        private convertToPageEntityData(
            fCast: WeatherForecastHour | WeatherForecastDay,
            forecastTitle: string
        ): PageEntityData {
            if (fCast == null) return null
            const date = new Date(fCast.date)

            let title = ''
            if (!NSPanelUtils.isStringNullOrEmpty(this.config.forecastTitleToday) && NSPanelDateUtils.isToday(date)) {
                title = this.config.forecastTitleToday
            } else {
                switch (forecastTitle) {
                    case NSPanelConstants.WEATHER_FORECAST_TITLE_DATESHORT:
                        {
                            const dateOptions: Intl.DateTimeFormatOptions = { ...DEFAULT_DATE_OPTIONS }

                            title = date.toLocaleDateString(this.config.dateLanguage, dateOptions)
                        }
                        break

                    case NSPanelConstants.WEATHER_FORECAST_TITLE_CUSTOM:
                        title = NSPanelDateUtils.format(
                            date,
                            this.config.forecastTitleCustomFormat,
                            this.config.dateLanguage
                        )
                        break

                    case NSPanelConstants.WEATHER_FORECAST_TITLE_WEEKDAY:
                    default:
                        title = NSPanelDateUtils.format(date, FORECAST_TITLE_FORMAT_WEEKDAY, this.config.dateLanguage)
                        break
                }
            }

            const temperature =
                'temperature' in fCast ? fCast.temperature : (fCast as WeatherForecastDay).temperatures?.day
            const temperatureFixed = Number.prototype.toFixed.call(temperature, this.config.forecastTemperatureDigits)

            const result: PageEntityData = {
                entityId: '',
                value: temperatureFixed + NSPanelConstants.STR_TEMPERATURE_DEGREE,
                text: title,
                icon: fCast.condition.icon,
                iconColor: '#abcabc',
            }

            return result
        }

        private _onClose(done: () => void) {
            done()
        }
    }

    RED.nodes.registerType('nspanel-weather-adapter', NSPanelWeatherAdapter)
}
