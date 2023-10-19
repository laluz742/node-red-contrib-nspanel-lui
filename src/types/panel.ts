import { SplitTime } from './base'
import { PageMap } from './controller'
import { HMIVersion } from './events'
import { IPanelNode } from './nodes'

export interface IPanelNodeEx extends IPanelNode {
    getPanelConfig(): PanelConfig
    getAllPages(): PageMap

    // FIXME spec function
    on(event: string, listener: Function): void // eslint-disable-line
}

export interface PanelConfig {
    panel: PanelParameters
    mqtt: PanelMqttConfig
}

export interface PanelVersion {
    hmi?: HMIVersion
}

export interface PanelMqttConfig {
    broker: string
    port: number
    clientId: string | undefined
    keepAlive: number
    useTls: boolean
    cleanSession: boolean
    username?: string
    password?: string

    reconnectPeriod?: number
    resubscribe?: boolean
}

export interface PanelParameters {
    topic: string
    fullTopic: string
    autoUpdate: boolean
    detachRelays: boolean
    telePeriod: number

    screenSaverOnStartup?: boolean

    panelTimeout: number
    panelDimHigh: number
    panelDimLow: number
    panelDimLowNight: number
    panelDimHighNight: number
    panelDimLowStartTime: SplitTime
    panelDimLowNightStartTime: SplitTime
}

export interface IPanelConfigNode {
    getMqttConfig(): PanelMqttConfig
}
