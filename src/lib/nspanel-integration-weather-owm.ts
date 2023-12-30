import {
    NodeMessageInFlow,
    WeatherCondition,
    WeatherConditionIntensity,
    WeatherConditionType,
    WeatherConverter,
    WeatherData,
    WeatherForecastDay,
    WeatherForecastHour,
    WeatherTemperature,
} from '../types/types'
import { NSPanelMessageUtils } from './nspanel-message-utils'

const STR_OWM_CURRENTLY = 'current'
const STR_OWM_HOURLY = 'hourly'
const STR_OWM_DAILY = 'daily'

/*
type OWMWeatherCondition =
    | OWMThunderstormConditions
    | OWMDrizzleConditions
    | OWMRainConditions
    | OWMSnowConditions
    | OWMAtmosphereConditions
    | OWMClearConditions
    | OWMCloudsCondition

// Condition-Codes from https://openweathermap.org/weather-conditions
type OWMThunderstormConditions = 200 | 201 | 202 | 210 | 211 | 212 | 221 | 230 | 231 | 232
type OWMDrizzleConditions = 300 | 301 | 302 | 310 | 311 | 312 | 313 | 314 | 321
type OWMRainConditions = 500 | 501 | 502 | 503 | 504 | 511 | 520 | 521 | 522 | 531
type OWMSnowConditions = 600 | 601 | 602 | 611 | 612 | 613 | 615 | 616 | 620 | 621 | 622
type OWMAtmosphereConditions = 701 | 711 | 721 | 731 | 741 | 751 | 761 | 762 | 771 | 781
type OWMClearConditions = 800
type OWMCloudsCondition = 801 | 802 | 803 | 804
*/

const OWM_CONDITIONS_MAP = new Map<number, [WeatherConditionType, WeatherConditionIntensity]>([
    /* 2xx thunderstorm */
    [200, ['thunderstorm', 0]],
    [201, ['thunderstorm', 1]],
    [202, ['thunderstorm', 2]],
    [210, ['thunderstorm', 0]],
    [211, ['thunderstorm', 1]],
    [212, ['thunderstorm', 2]],
    [221, ['thunderstorm', 1]],
    [230, ['thunderstorm', 1]],
    [231, ['thunderstorm', 2]],
    [232, ['thunderstorm', 3]],

    /* 3xx drizzle */
    [300, ['drizzle', 0]],
    [301, ['drizzle', 1]],
    [302, ['drizzle', 2]],
    [310, ['drizzle', 0]],
    [311, ['drizzle', 1]],
    [312, ['drizzle', 2]],
    [313, ['drizzle', 3]],
    [314, ['drizzle', 4]],
    [321, ['drizzle', 1]],

    /* 5xx rain */
    [500, ['rain', 0]],
    [501, ['rain', 1]],
    [502, ['rain', 2]],
    [503, ['rain', 3]],
    [504, ['rain', 4]],
    [511, ['rain', 1]],
    [520, ['rain', 0]],
    [521, ['rain', 1]],
    [522, ['rain', 2]],
    [531, ['rain', 1]],

    /* 6xx snow */
    [600, ['snow', 0]],
    [601, ['snow', 1]],
    [602, ['snow', 2]],
    [611, ['sleet', 1]],
    [612, ['sleet', 2]],
    [613, ['sleet', 3]],
    [611, ['snow', 1]],
    [612, ['snow', 1]],
    [613, ['snow', 1]],
    [615, ['snow', 0]],
    [616, ['snow', 1]],
    [620, ['snow', 0]],
    [621, ['snow', 1]],
    [622, ['snow', 2]],

    /* 7xx atmosphere */
    [701, ['mist', 1]],
    [711, ['smoke', 1]],
    [721, ['haze', 1]],
    [731, ['dust', 1]],
    [741, ['fog', 1]],
    [751, ['sand', 1]],
    [761, ['dust', 1]],
    [762, ['ash', 2]],
    [771, ['squall', 1]],
    [781, ['tornado', 1]],

    /* 800 clear */
    [800, ['clear', 0]],

    /* 80x clouds */
    [801, ['clouds', 1]],
    [802, ['clouds', 2]],
    [803, ['clouds', 3]],
    [804, ['clouds', 4]],
])

type OWMWeather = {
    id: WeatherCondition
    main: string
    description: string
    icon: string
}

type ForecastBase = {
    dt: number

    pressure: number
    humidity: number

    weather: OWMWeather

    dew_point: number

    wind_deg: number
    wind_speed: number
    wind_gust: number

    clouds: number
    uvi: number
}

type OpenWeatherForecastHourly = ForecastBase & {
    temp: number
    feels_like: number

    visibility: number
}

type OpenWeatherForecastDaily = ForecastBase & {
    sunrise?: number
    sunset?: number
    moonrise?: number
    moonset?: number

    temp: WeatherTemperature
    feelsLike: WeatherTemperature

    rain?: number
}

export class OpenWeatherConverter implements WeatherConverter {
    public convert(msg: NodeMessageInFlow): WeatherData {
        const data = msg.payload
        if (data == null) return null

        const result: WeatherData = { temperatureUnit: undefined }

        if (NSPanelMessageUtils.objectHasOwnProperty(data, STR_OWM_CURRENTLY)) {
            const fCurrent = this.doConvertHourly(data[STR_OWM_CURRENTLY])
            result.current = fCurrent
        }

        if (NSPanelMessageUtils.objectHasOwnProperty(data, STR_OWM_DAILY) && Array.isArray(data[STR_OWM_DAILY])) {
            result.daily = []
            for (const fDayData of data[STR_OWM_DAILY]) {
                const fDay = this.doConvertDaily(fDayData)
                if (fDay != null) result.daily.push(fDay)
            }
        }

        if (NSPanelMessageUtils.objectHasOwnProperty(data, STR_OWM_HOURLY) && Array.isArray(data[STR_OWM_HOURLY])) {
            result.hourly = []
            for (const fHourlyData of data[STR_OWM_HOURLY]) {
                const fHour = this.doConvertHourly(fHourlyData)
                if (fHour != null) result.hourly.push(fHour)
            }
        }

        return result
    }

    private doConvertDaily(data: any): WeatherForecastDay {
        let result: WeatherForecastDay = null

        const owmData = data as OpenWeatherForecastDaily
        if (Number.isInteger(owmData.dt)) {
            const temperatures = this.doConvertTemperatures(owmData.temp)

            if (typeof owmData['temp'] !== 'object')
                temperatures.current = NSPanelMessageUtils.getPropertyOrNull(owmData, 'temp')

            result = {
                date: new Date(owmData.dt * 1000),
                sunrise: new Date(owmData.sunrise * 1000),
                sunset: new Date(owmData.sunset * 1000),
                moonrise: new Date(owmData.moonrise * 1000),
                moonset: new Date(owmData.moonset * 1000),

                temperatures,

                pressure: owmData.pressure,
                humidity: owmData.humidity,
                condition: this.convertCondition(owmData.weather),
            }
        }

        return result
    }

    private doConvertHourly(data: any): WeatherForecastHour {
        let result: WeatherForecastHour = null

        const owmData = data as OpenWeatherForecastHourly

        if (Number.isInteger(owmData.dt)) {
            result = {
                date: new Date(owmData.dt * 1000),

                temperature: owmData.temp,
                feelsLike: owmData.feels_like,

                pressure: owmData.pressure,
                humidity: owmData.humidity,
                condition: this.convertCondition(owmData.weather),
                /*
                TODO:
                "dew_point": 6.63,
                "uvi": 0.04,
                "clouds": 100,
                "visibility": 7239,
                "wind_speed": 10.39,
                "wind_deg": 236,
                "wind_gust": 21.93,
                "pop": 1,
                "rain": {
                    "1h": 1.7
                }
                */
            }
        }

        return result
    }

    private convertCondition(data: any): WeatherCondition {
        let result: WeatherCondition = null
        let weatherData = data

        if (Array.isArray(weatherData)) {
            weatherData = weatherData[0]
        }

        if (!Number.isNaN(weatherData.id)) {
            const conditionTuple: [WeatherConditionType, WeatherConditionIntensity] = this.convertConditonInternal(
                weatherData.id
            )

            result = {
                icon: this.convertIcon(weatherData.icon),
                main: weatherData.main,
                description: weatherData.description,
                originalId: weatherData.id,
                condition: conditionTuple[0],
                conditionIntensity: conditionTuple[1],
            }
        }

        return result
    }

    private doConvertTemperatures(data: any): WeatherTemperature {
        const result: WeatherTemperature = {}

        result.morning = NSPanelMessageUtils.getPropertyOrNull(data, 'morning')
        result.day = NSPanelMessageUtils.getPropertyOrNull(data, 'day')
        result.evening = NSPanelMessageUtils.getPropertyOrNull(data, 'evening')
        result.night = NSPanelMessageUtils.getPropertyOrNull(data, 'night')
        result.min = NSPanelMessageUtils.getPropertyOrNull(data, 'min')
        result.max = NSPanelMessageUtils.getPropertyOrNull(data, 'max')

        return result
    }

    private convertIcon(icon: string): string {
        const condition = icon?.substring(0, 2)
        const dayNight = icon?.substring(2, 1)

        let result

        switch (condition) {
            case '01': // clear sky
                result = dayNight === 'd' ? 'weather-sunny' : 'weather-night'
                break
            case '02': // few clouds
                result = 'partly-cloudy'
                break
            case '03': // scattered clouds
                result = 'weather-cloudy'
                break
            case '04': // broken clouds
                result = 'partly-cloudy'
                break
            case '09': // shower rain
                result = 'weather-pouring'
                break
            case '10': // rain
                result = 'weather-rainy'
                break
            case '11': // thunderstorm
                result = 'weather-lightning'
                break
            case '13': // snow
                result = 'weather-snowy'
                break
            case '50': // mist
                result = 'weather-fog'
                break

            default:
                result = ''
                break
        }

        if (!result.startsWith('weather')) {
            result = `weather-${dayNight === 'n' ? 'night-' : ''}${result}`
        }

        return result
    }

    private convertConditonInternal(id: number): [WeatherConditionType, WeatherConditionIntensity] {
        const tuple: [WeatherConditionType, WeatherConditionIntensity] = OWM_CONDITIONS_MAP.get(id)

        return tuple
    }
}
