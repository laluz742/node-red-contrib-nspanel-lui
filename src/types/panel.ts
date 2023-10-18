import { SplitTime } from './base'
import { PageMap } from './controller'
import { HMIVersion } from './events'
import { INodeConfig } from './node-red'
import { IPageNode } from './pages'

export interface IPanelNode extends INodeConfig {
    registerPage(pageNode: IPageNode): void
    deregisterPage(pageNode: IPageNode): void
}
export interface IPanelNodeEx extends IPanelNode {
    getPanelConfig(): PanelConfig
    getAllPages(): PageMap

    on(event: string, listener: Function): void
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
