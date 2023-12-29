import { TemperatureUnit } from './base'
import { NodeMessageInFlow } from './nodered'

export type WeatherConditionType =
    | 'thunderstorm'
    | 'drizzle'
    | 'rain'
    | 'snow'
    | 'sleet'
    | 'clear'
    | 'clouds'
    | 'mist'
    | 'smoke'
    | 'haze'
    | 'dust'
    | 'ash'
    | 'fog'
    | 'sand'
    | 'squall'
    | 'tornado'
export type WeatherConditionIntensity = 0 | 1 | 2 | 3 | 4

export type WeatherCondition = {
    condition: WeatherConditionType
    conditionIntensity: WeatherConditionIntensity

    icon: string
    main?: string
    description?: string
    originalId?: number
}

export type WeatherTemperature = {
    current?: number

    morning?: number
    day?: number
    evening?: number
    night?: number
    min?: number
    max?: number
}

export type WeatherForecastBase = {
    date: Date
    pressure: number
    humidity: number
    condition?: WeatherCondition
}

export type WeatherForecastHour = WeatherForecastBase & {
    temperature?: number
    feelsLike?: number
}

export type WeatherForecastDay = WeatherForecastBase & {
    sunrise?: Date
    sunset?: Date
    moonrise?: Date
    moonset?: Date

    temperatures?: WeatherTemperature
    feelsLikes?: WeatherTemperature
}

export type WeatherData = {
    current?: WeatherForecastHour

    hourly?: WeatherForecastHour[]
    daily?: WeatherForecastDay[]

    temperatureUnit: TemperatureUnit
}

export interface WeatherConverter {
    convert(data: NodeMessageInFlow): WeatherData
}
