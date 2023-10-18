import { NodeBase } from '@lib/node-base'
import { NSPanelUtils } from '@lib/nspanel-utils'
import {
    IPageNode,
    INodeConfig,
    IPanelConfigNode,
    VoidCallback,
    IPanelNodeEx,
    PanelConfig,
    PageMap,
    PageId,
} from '@types'

interface NSPanelConfig extends INodeConfig {
    nsPanelConfig: string

    topic: string
    fullTopic: string

    telePeriod: number
    detachRelays: boolean
    autoUpdate: boolean

    panelTimeout: number
    panelDimHigh: number
    panelDimLow: number
    panelDimLowNight: number
    panelDimHighNight: number
    panelDimLowStartTime: string | undefined
    panelDimLowNightStartTime: string | undefined
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
            this.emit('nav:pageId', pageId) //TODO: move to controller, @see page-node-base #handlePageNavigationEvent
        }

        getPanelConfig(): PanelConfig {
            const cfg: PanelConfig = {
                panel: {
                    topic: this.config.topic,
                    fullTopic: this.config.fullTopic,
                    detachRelays: this.config.detachRelays,
                    autoUpdate: this.config.autoUpdate,
                    telePeriod: this.config.telePeriod,
                    panelTimeout: this.config.panelTimeout,
                    panelDimHigh: this.config.panelDimHigh,
                    panelDimLow: this.config.panelDimLow,
                    panelDimLowNight: this.config.panelDimLowNight,
                    panelDimHighNight: this.config.panelDimHighNight,
                    panelDimLowStartTime: NSPanelUtils.splitTime(this.config.panelDimLowStartTime),
                    panelDimLowNightStartTime: NSPanelUtils.splitTime(this.config.panelDimLowNightStartTime),
                },

                mqtt: this.nsPanelConfigNode.getMqttConfig(),
            }

            return cfg
        }

        getAllPages(): PageMap {
            return this.pages
        }

        private onClose(done: VoidCallback) {
            //TODO: inform anyone?
            done()
        }
    }

    RED.nodes.registerType('nspanel-panel', NSPanelNode)
}
