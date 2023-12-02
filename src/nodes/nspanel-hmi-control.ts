/* eslint-disable import/no-import-module-exports */
import { NodeBase } from '../lib/node-base'

import {
    PageConfig,
    IPageNode,
    IPanelNode,
    NodeMessageInFlow,
    NodeRedOnErrorCallback,
    NodeRedSendCallback,
    HMICommand,
} from '../types/types'

interface NSPanelNavToConfig extends PageConfig {}

module.exports = (RED) => {
    class NSPanelHMIControlNode extends NodeBase<NSPanelNavToConfig> implements IPageNode {
        private panelNode: IPanelNode | null = null

        constructor(config: NSPanelNavToConfig) {
            super(config, RED)

            const panelNode = <IPanelNode>(<unknown>RED.nodes.getNode(config.nsPanel))

            if (!panelNode || panelNode.type !== 'nspanel-panel') {
                this.warn('Panel configuration is disabled or missing, please review the node settings')
                this.setNodeStatus('error', RED._('common.status.notAssignedToAPanel'))
            } else {
                this.panelNode = panelNode
                this.panelNode.registerPage(this)
                this.clearNodeStatus()
            }

            this.on('close', (done: () => void) => this._onClose(done))
            this.on('input', (msg: NodeMessageInFlow, send: NodeRedSendCallback, done: NodeRedOnErrorCallback) =>
                this._onHmiControlInput(msg, send, done)
            )
        }

        private _onHmiControlInput(msg: NodeMessageInFlow, _send: NodeRedSendCallback, done: NodeRedOnErrorCallback) {
            if ('payload' in msg && typeof msg['payload'] === 'string') {
                this.emit('nav:page', msg.payload)
            }
            done()
        }

        private _onClose(done: () => void) {
            this.panelNode?.deregisterPage(this)
            done()
        }

        public getPageType() {
            return '@hmi-control'
        }

        public generatePage(): HMICommand | HMICommand[] | null {
            return null
        }

        public generatePopupDetails(_type: string, _entityId: string) {
            return null
        }

        public isForceRedraw(): boolean {
            return false
        }

        public needsSensorData(): boolean {
            return false
        }

        public needsRelayStates(): boolean {
            return false
        }

        public setActive(_state: boolean) {}

        public isScreenSaver(): boolean {
            return false
        }

        public getPanel() {
            return this.panelNode
        }

        public getTimeout() {
            return null
        }
    }

    RED.nodes.registerType('nspanel-hmi-control', NSPanelHMIControlNode)
}
