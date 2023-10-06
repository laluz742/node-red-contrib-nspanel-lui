import { ActiveCharacteristic, HSVColor, RGBColor } from '.'

export declare interface ValidEventSpec {
    //FIXME: naming
    event: string
    label: string
}

export declare interface EventMapping {
    event: string
    value: string
    t: string
    data?: string
    dataType?: string
    icon?: string
    iconColor?: string
}

export interface EventArgs {
    topic: string

    source: string
    event: string
    event2?: string
    entityId?: string

    value?: number
    active?: ActiveCharacteristic

    data?: any
}

export interface LightEventArgs extends EventArgs {
    rgb: RGBColor
    hsv: HSVColor
}

export interface StartupEventArgs extends EventArgs {
    hmiVersion: HMIVersion
}
export interface HMIVersion {
    version: number
    model: string
}

export interface HardwareEventArgs extends EventArgs {
    topic: 'hw'
}

export interface SensorEventArgs extends EventArgs {
    topic: 'sensor'
    temp?: number
}