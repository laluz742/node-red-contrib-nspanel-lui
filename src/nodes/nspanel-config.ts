import { NodeBase } from '@lib/node-base'
import { INodeConfig, IPanelConfigNode, PanelMqttConfig, VoidCallback } from '@types'

module.exports = (RED) => {
    interface NSPanelConfig extends INodeConfig, PanelMqttConfig {}

    interface NSPanelMqttCreds {
        mqttUsername: string | undefined
        mqttPassword: string | undefined
    }

    class NSPanelConfigNode extends NodeBase<NSPanelConfig, NSPanelMqttCreds> implements IPanelConfigNode {
        private config: NSPanelConfig

        constructor(config: NSPanelConfig) {
            super(config, RED)

            this.config = config
            this.on('close', (done: VoidCallback) => this.onClose(done))
        }

        getMqttConfig(): PanelMqttConfig {
            const cfg: PanelMqttConfig = {
                broker: this.config.broker,
                port: this.config.port,
                clientId: this.config.clientId,
                keepAlive: this.config.keepAlive,
                useTls: this.config.useTls,
                cleanSession: this.config.cleanSession,
            }

            if (this.credentials) {
                cfg.username = this.credentials.mqttUsername
                cfg.password = this.credentials.mqttPassword
            }

            return cfg
        }

        private onClose(done: VoidCallback) {
            //TODO: inform nodes?
            done()
        }
    }

    RED.nodes.registerType('nspanel-config', NSPanelConfigNode, {
        credentials: {
            mqttUsername: { type: 'text' },
            mqttPassword: { type: 'password' },
        },
    })
}
