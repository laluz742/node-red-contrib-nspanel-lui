export interface IDisposable {
    dispose(): void
}

export type SplitTime = {
    hours: number
    minutes: number
}

export type TemperatureUnit = 'C' | 'F'

export type StatusLevel = 'error' | 'warn' | 'info' | 'success' | null

export type ActiveCharacteristic = boolean | 0 | 1 | '0' | '1'

export type TargetTemperatureState = 'below' | 'on' | 'above'

export type PageId = string
