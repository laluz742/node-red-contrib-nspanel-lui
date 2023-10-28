import { HSVColor, RGBColor } from './colors'
import { ActiveCharacteristic } from './base'

export type ValidEventDescriptor = {
    event: string
    label: string
}

export declare type EventMapping = {
    event: string
    value: string | null
    t: string | null
    data?: string
    dataType?: string
    icon?: string
    iconColor?: string
}

export type EventArgs = {
    type: string
    date?: Date

    source: string
    event: string
    event2?: string
    entityId?: string

    value?: number
    active?: ActiveCharacteristic

    data?: any
}

export type LightEventArgs = EventArgs & {
    rgb: RGBColor
    hsv: HSVColor
}

export type StartupEventArgs = EventArgs & {
    hmiVersion: HMIVersion
}

export type VersionData = {
    version: string | null
    internalVersion?: string
    model?: string
    url?: string
}

export type HMIVersion = VersionData & {
    internalVersion: string
    model?: string
}

export type HardwareEventArgs = EventArgs & {
    type: 'hw'
}

export type SensorEventArgs = EventArgs & {
    type: 'sensor'
    temp?: number
    tempUnit?: ['C', 'F']
}

export type FirmwareType = 'tasmota' | 'nlui' | 'hmi'

export type FirmwareEventArgs = EventArgs & {
    type: 'fw'
    source: FirmwareType
    event: 'update' | 'version' | 'updateAvailable' | 'install'

    version?: string
    model?: string
    status?: 'success' | 'failed'
    statusMsg?: string
}

export type TasmotaEvent = EventArgs & {
    type: 'fw'
    event: string
}
