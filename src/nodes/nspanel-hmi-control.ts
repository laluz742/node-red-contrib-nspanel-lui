import { Logger } from '../lib/logger'
import { NodeBase } from '../lib/node-base'

import {
    IPageConfig,
    IPageNode,
    IPanelNode,
    NodeMessageInFlow,
    NodeRedOnErrorCallback,
    NodeRedSendCallback,
} from '../types'

const log = Logger('NSPanelHMIControlNode')

interface NSPanelNavToConfig extends IPageConfig {}

module.exports = (RED) => {
    class NSPanelHMIControlNode extends NodeBase<NSPanelNavToConfig> implements IPageNode {
        private panelNode: IPanelNode = null

        constructor(config: NSPanelNavToConfig) {
            super(config, RED)

            const panelNode = <IPanelNode>(<unknown>RED.nodes.getNode(config.nsPanel))

            if (!panelNode || panelNode.type !== 'nspanel-panel') {
                this.warn('Panel configuration is wrong or missing, please review the node settings') //FIXME i18n panel missing
                this.status({
                    fill: 'red',
                    shape: 'dot',
                    text: 'Panel not configured', //TODO: i18n
                })
            } else {
                this.panelNode = panelNode
                this.panelNode.registerPage(this)
            }

            this.on('close', (done: () => void) => this._onClose(done))
            this.on('input', (msg: NodeMessageInFlow, send: NodeRedSendCallback, done: NodeRedOnErrorCallback) =>
                this._onHmiControlInput(msg, send, done)
            )
        }

        private _onHmiControlInput(msg: NodeMessageInFlow, send: NodeRedSendCallback, done: NodeRedOnErrorCallback) {
            if ('payload' in msg && typeof msg['payload'] === 'string') {
                this.emit('nav:page', msg.payload)
            }
            done()
        }

        private _onClose(done: () => void) {
            this.panelNode.deregisterPage(this)
            done()
        }

        public getPageType(): string {
            return '@hmi-control'
        }

        public generatePage(): string | string[] {
            return ''
        }

        public generatePopupDetails(type: string, entityId: string): string | string[] {
            return null
        }

        public setActive(state: boolean): void {}

        public isScreenSaver(): boolean {
            return false
        }

        public getPanel() {
            return this.panelNode
        }

        public getTimeout(): number {
            return null
        }
    }

    RED.nodes.registerType('nspanel-hmi-control', NSPanelHMIControlNode)
}
