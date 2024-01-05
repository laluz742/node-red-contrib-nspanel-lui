/* eslint-disable import/no-import-module-exports */
import { NodeBase } from '../lib/node-base'
import { NSPanelUtils } from '../lib/nspanel-utils'
import {
    IPageNode,
    INodeConfig,
    IPanelConfigNode,
    VoidCallback,
    IPanelNodeEx,
    PanelConfig,
    PageMap,
    PageId,
} from '../types/types'

interface NSPanelConfig extends INodeConfig {
    nsPanelConfig: string

    panelType: string

    topic: string
    fullTopic: string

    telePeriod: number
    detachRelays: boolean

    enableUpdates: boolean
    timeToCheckForUpdates: string
    autoUpdate: boolean
    tasmotaOtaUrl: string

    panelTimeout: number
    panelDimHigh: number
    panelDimLow: number
    panelDimLowNight: number
    panelDimHighNight: number
    panelDimLowStartTime: string | undefined
    panelDimLowNightStartTime: string | undefined

    dateFormatWeekday: 'short' | 'long'
    dateFormatDay: 'numeric' | '2-digit'
    dateFormatMonth: 'numeric' | '2-digit' | 'short' | 'long'
    dateFormatYear: 'numeric' | '2-digit'

    timeFormatHour: 'numeric' | '2-digit'
    timeFormatMinute: 'numeric' | '2-digit'
    timeFormatTimeNotation: '12' | '24'
    timeFormatShowAmPm: boolean

    useCustomDateTimeFormat: boolean
    dateCustomFormat: string
    timeCustomFormat: string

    dateLanguage: string
}

module.exports = (RED) => {
    class NSPanelNode extends NodeBase<NSPanelConfig> implements IPanelNodeEx {
        private nsPanelConfigNode: IPanelConfigNode

        private config: NSPanelConfig

        private pages: PageMap = new Map()

        constructor(config: NSPanelConfig) {
            super(config, RED)
            this.nsPanelConfigNode = <IPanelConfigNode>(<unknown>RED.nodes.getNode(config.nsPanelConfig))
            this.config = config
            this.on('close', (done: VoidCallback) => this.onClose(done))
        }

        registerPage(pageNode: IPageNode) {
            this.pages[pageNode.id] = pageNode
            this.emit('page:register', pageNode)
        }

        deregisterPage(pageNode: IPageNode) {
            delete this.pages[pageNode.id]
            this.emit('page:deregister', pageNode)
        }

        navToPage(pageId: PageId) {
            this.emit('nav:pageId', pageId) // TODO: move to controller, @see page-node-base #handlePageNavigationEvent
        }

        getPanelConfig(): PanelConfig {
            const cfg: PanelConfig = {
                panel: {
                    panelType: this.config.panelType,

                    topic: this.config.topic,
                    fullTopic: this.config.fullTopic,
                    detachRelays: this.config.detachRelays,
                    telePeriod: this.config.telePeriod,

                    enableUpdates: this.config.enableUpdates,
                    timeToCheckForUpdates: NSPanelUtils.splitTime(this.config.timeToCheckForUpdates),
                    autoUpdate: this.config.autoUpdate,
                    tasmotaOtaUrl: this.config.tasmotaOtaUrl,

                    panelTimeout: this.config.panelTimeout,
                    panelDimHigh: this.config.panelDimHigh,
                    panelDimLow: this.config.panelDimLow,
                    panelDimLowNight: this.config.panelDimLowNight,
                    panelDimHighNight: this.config.panelDimHighNight,
                    panelDimLowStartTime: NSPanelUtils.splitTime(this.config.panelDimLowStartTime),
                    panelDimLowNightStartTime: NSPanelUtils.splitTime(this.config.panelDimLowNightStartTime),

                    dateLanguage: this.config.dateLanguage,
                    dateFormatWeekday: this.config.dateFormatWeekday,
                    dateFormatDay: this.config.dateFormatDay,
                    dateFormatMonth: this.config.dateFormatMonth,
                    dateFormatYear: this.config.dateFormatYear,

                    timeFormatHour: this.config.timeFormatHour,
                    timeFormatMinute: this.config.timeFormatMinute,
                    timeFormatTimeNotation: this.config.timeFormatTimeNotation,
                    timeFormatShowAmPm: this.config.timeFormatShowAmPm,

                    useCustomDateTimeFormat: this.config.useCustomDateTimeFormat,
                    dateCustomFormat: this.config.dateCustomFormat,
                    timeCustomFormat: this.config.timeCustomFormat,
                },

                mqtt: this.nsPanelConfigNode.getMqttConfig(),
            }

            return cfg
        }

        getAllPages(): PageMap {
            return this.pages
        }

        private onClose(done: VoidCallback) {
            // TODO: inform anyone?
            done()
        }
    }

    RED.nodes.registerType('nspanel-panel', NSPanelNode)
}
