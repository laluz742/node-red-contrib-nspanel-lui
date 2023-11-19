import { SplitTime } from './base'
import { PageMap } from './controller'
import { HMIVersion } from './events'
import { IPageNode, IPanelNode } from './page-nodes'

export interface IPanelNodeEx extends IPanelNode {
    getPanelConfig(): PanelConfig
    getAllPages(): PageMap

    on(event: 'page:register', listener: (pageNode: IPageNode) => void): void
    on(event: 'page:deregister', listener: (pageNode: IPageNode) => void): void
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

    enableUpdates: boolean
    timeToCheckForUpdates: SplitTime
    autoUpdate: boolean
    tasmotaOtaUrl: string

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

    dateFormatWeekday: 'short' | 'long'
    dateFormatDay: 'numeric' | '2-digit'
    dateFormatMonth: 'numeric' | '2-digit' | 'short' | 'long'
    dateFormatYear: 'numeric' | '2-digit'

    timeFormatHour: 'numeric' | '2-digit'
    timeFormatMinute: 'numeric' | '2-digit'

    useCustomDateTimeFormat: boolean
    dateCustomFormat: string
    timeCustomFormat: string
}

export interface IPanelConfigNode {
    getMqttConfig(): PanelMqttConfig
}
