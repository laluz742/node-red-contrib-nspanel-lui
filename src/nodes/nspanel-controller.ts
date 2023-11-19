/* eslint-disable import/no-import-module-exports */
import { NodeBase } from '../lib/node-base'
import { NSPanelController } from '../lib/nspanel-controller'
import { NSPanelMessageUtils } from '../lib/nspanel-message-utils'
import {
    CommandData,
    EventArgs,
    FirmwareEventArgs,
    IPanelController,
    PanelControllerConfig,
    IPanelNodeEx,
    NodeMessageInFlow,
    NodeRedOnErrorCallback,
    NodeRedSendCallback,
    NodeStatus,
    NotifyData,
    PanelMessage,
    StatusLevel,
} from '../types/types'
import * as NSPanelConstants from '../lib/nspanel-constants'

module.exports = (RED) => {
    class NSPanelControllerNode extends NodeBase<PanelControllerConfig> {
        private nsPanelController: IPanelController | null = null

        private panelNode: IPanelNodeEx | null = null

        private config: PanelControllerConfig

        constructor(config: PanelControllerConfig) {
            super(config, RED)

            this.config = { ...config }
            this.panelNode = (<unknown>RED.nodes.getNode(this.config.nsPanel)) as IPanelNodeEx

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
                case NSPanelConstants.STR_MSG_TOPIC_COMMAND: {
                    this.handleCommandInput(msg)
                    break
                }

                // TODO: process using NSPanelMessageUtils#convertToCommandData to normalize msg
                case NSPanelConstants.STR_MSG_TOPIC_NOTIFY: {
                    const notifyData: NotifyData = <NotifyData>msg.payload
                    this.nsPanelController?.showNotification(notifyData)
                    break
                }
            }

            send(msg) // TODO: really forward or just consume
        }

        private handleCommandInput(msg: PanelMessage): void {
            const cmdInputData = Array.isArray(msg.payload) ? msg.payload : [msg.payload]

            const allCommands: CommandData[] = []

            cmdInputData.forEach((item, _idx) => {
                const cmdResult: CommandData | null = NSPanelMessageUtils.convertToCommandData(item)
                if (cmdResult !== null) {
                    allCommands.push(cmdResult)
                }
            })

            this.nsPanelController?.executeCommand(allCommands)
        }

        private init(ctrlConfig: PanelControllerConfig) {
            // get node-red/system/default locale
            const redLocaleOrDefault = RED.settings.lang ?? Intl.DateTimeFormat().resolvedOptions().locale ?? 'en'
            ctrlConfig.lang =
                redLocaleOrDefault.indexOf('-') > 0
                    ? redLocaleOrDefault.substring(0, redLocaleOrDefault.indexOf('-'))
                    : redLocaleOrDefault.lang

            // build panel config
            if (this.panelNode === null) {
                this.setNodeStatus('error', RED._('common.status.notAssignedToAPanel'))
            } else {
                // init controller and link events
                const controller = new NSPanelController(ctrlConfig, this.panelNode, RED._)
                this.nsPanelController = controller
                controller.on('status', (eventArgs) => this.onControllerStatusEvent(eventArgs))
                controller.on('sensor', (sensorData) => this.onControllerSensorEvent(sensorData))
                controller.on('event', (msg) => this.onControllerEvent(msg))

                controller.registerPages(this.panelNode.getAllPages())
                this.panelNode.on('page:register', (pageNode) => {
                    controller.registerPage(pageNode)
                })
                this.panelNode.on('page:deregister', (pageNode) => {
                    controller.deregisterPage(pageNode)
                })

                // forward RED events
                RED.events.on('flows:starting', () => this.nsPanelController?.onFlowsStarting())
                RED.events.on('flows:started', () => this.nsPanelController?.onFlowsStarted()) // TODO: need done?
            }
        }

        private onControllerEvent(msg: NodeMessageInFlow) {
            // forward to output
            this.send(msg)

            if (msg.topic === 'fw') {
                const fwEventArgs: FirmwareEventArgs = msg?.payload as FirmwareEventArgs
                let statusLevel: StatusLevel = 'info'
                let statusText: string

                switch (fwEventArgs.event) {
                    case 'install': {
                        statusText = RED._('common.status.updateInstalling')
                        break
                    }

                    case 'update': {
                        statusLevel = fwEventArgs.status === 'success' ? 'success' : 'error'
                        statusText =
                            fwEventArgs.status === 'success'
                                ? RED._('common.status.updateInstalled')
                                : RED._('common.status.updateFailed')
                        break
                    }

                    case 'updateAvailable': {
                        statusText = RED._('common.status.newFirmwareAvailable')
                        break
                    }
                }

                if (statusText != null) {
                    statusText += ` (${fwEventArgs.source})`
                    this.setNodeStatus(statusLevel, statusText)
                }
            }
        }

        private onControllerSensorEvent(eventArgs: EventArgs) {
            this.send(eventArgs)
        }

        private onControllerStatusEvent(nodeStatus: NodeStatus) {
            this.setNodeStatus(nodeStatus.statusLevel, nodeStatus.msg)
        }
    }

    RED.nodes.registerType('nspanel-controller', NSPanelControllerNode)
}
