import { NodeBase } from '@lib/node-base'
import { NSPanelController } from '@lib/nspanel-controller'
import { NSPanelMessageUtils } from '@lib/nspanel-message-utils'
import {
    CommandData,
    EventArgs,
    IPanelController,
    IPanelNodeEx,
    NodeMessageInFlow,
    NodeRedOnErrorCallback,
    NodeRedSendCallback,
    NotifyData,
    PanelBasedConfig,
    PanelMessage,
} from '@types'

interface NSPanelControllerConfig extends PanelBasedConfig {
    screenSaverOnStartup: boolean
}

module.exports = (RED) => {
    class NSPanelControllerNode extends NodeBase<NSPanelControllerConfig> {
        private nsPanelController: IPanelController | null = null
        private panelNode: IPanelNodeEx | null = null
        private config: NSPanelControllerConfig

        constructor(config: NSPanelControllerConfig) {
            super(config, RED)

            this.config = Object.assign({}, config)
            this.panelNode = <IPanelNodeEx>(<unknown>RED.nodes.getNode(this.config.nsPanel))

            this.on('input', (msg: NodeMessageInFlow, send: NodeRedSendCallback) => this.onInput(msg, send))
            this.on('close', (done: NodeRedOnErrorCallback) => this.onClose(done))
            this.init(this.config)
        }

        private onClose(done: NodeRedOnErrorCallback) {
            this.nsPanelController?.dispose()
            done()
        }

        private onInput(msg: PanelMessage, send: NodeRedSendCallback) {
            if (!NSPanelMessageUtils.hasProperty(msg, 'topic')) return
            if (!NSPanelMessageUtils.hasProperty(msg, 'payload')) return

            switch (msg.topic) {
                case 'cmd':
                    this.handleCommandInput(msg)
                    break

                case 'notify':
                    const notifyData: NotifyData = <NotifyData>msg.payload
                    this.nsPanelController?.showNotification(notifyData)
                    break
            }

            send(msg) // TODO: really forward or just consume
        }

        private handleCommandInput(msg: PanelMessage): void {
            const cmdInputData = Array.isArray(msg.payload) ? msg.payload : [msg.payload]

            var allCommands: CommandData[] = []

            cmdInputData.forEach((item, _idx) => {
                var cmdResult: CommandData | null = NSPanelMessageUtils.convertToCommandData(item)
                if (cmdResult !== null) {
                    allCommands.push(cmdResult)
                }
            })

            this.nsPanelController?.executeCommand(allCommands)

            /*TODO: Beep command   switch (payload.cmd) {
                   case 'beep':
                       const cmdParam = payload.params
                       this.nsPanelController.sendBuzzerCommand(
                           cmdParam.count,
                           cmdParam.beep,
                           cmdParam.silence,
                           cmdParam.tune
                       )
                       break
               }*/
        }

        private init(config: NSPanelControllerConfig) {
            // build panel config
            if (this.panelNode === null) {
                this.setNodeStatus('error', RED._('common.status.notAssignedToAPanel'))
            } else {
                const panelConfig = this.panelNode.getPanelConfig()
                panelConfig.panel.screenSaverOnStartup = config.screenSaverOnStartup

                // init controller and link events
                const controller = new NSPanelController(panelConfig, RED._)
                this.nsPanelController = controller
                controller.on('status', (eventArgs) => this.onControllerStatusEvent(eventArgs))
                controller.on('sensor', (sensorData) => this.onControllerSensorEvent(sensorData))
                controller.on('event', (eventArgs) => this.onControllerEvent(eventArgs))

                controller.registerPages(this.panelNode.getAllPages())
                this.panelNode.on('page:register', (pageNode) => {
                    controller.registerPage(pageNode)
                })
                this.panelNode.on('page:deregister', (pageNode) => {
                    controller.deregisterPage(pageNode)
                })

                // forward RED events
                RED.events.on('flows:starting', () => this.nsPanelController?.onFlowsStarting())
                RED.events.on('flows:started', () => this.nsPanelController?.onFlowsStarted()) //TODO: need done?
            }
        }

        private onControllerEvent(eventArgs: EventArgs) {
            this.send(eventArgs)
        }

        private onControllerSensorEvent(eventArgs: EventArgs) {
            this.send(eventArgs)
        }

        private onControllerStatusEvent(eventArgs) {
            this.setNodeStatus(eventArgs.topic, eventArgs.msg)
        }
    }

    RED.nodes.registerType('nspanel-controller', NSPanelControllerNode)
}
