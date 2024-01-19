import * as mqtt from 'mqtt'
import * as nEvents from 'events'

import { Logger } from './logger'
import { MqttUtils } from './mqtt-utils'
import { NSPanelUtils } from './nspanel-utils'
import { NSPanelMessageParser } from './nspanel-message-parser'
import {
    PanelConfig,
    EventArgs,
    HardwareEventArgs,
    IPanelMqttHandler,
    SensorEventArgs,
    FirmwareEventArgs,
    TasmotaEventArgs,
    HMICommand,
    TasmotaCommand,
} from '../types/types'
import * as NSPanelConstants from './nspanel-constants'

const log = Logger('NSPanelMqttHandler')

type MqttTopics = {
    customCommandTopic: string
    commandTopic: string
    teleResultTopic: string
    statResultTopic: string
    statUpgradeTopic: string
    sensorTopic: string
    status2Topic: string
}

export class NSPanelMqttHandler extends nEvents.EventEmitter implements IPanelMqttHandler {
    private mqttTopics: MqttTopics

    private mqttBrokerUrl: string = null

    private mqttOptions: mqtt.IClientOptions = {}

    private mqttClient: mqtt.MqttClient | null = null

    private connected: boolean = false

    constructor(panelConfig: PanelConfig) {
        super()

        this.init(panelConfig)
    }

    public dispose() {
        this.mqttClient?.end()
    }

    public sendCommandToPanel(tCmd: TasmotaCommand) {
        if (this.connected) {
            if (tCmd == null && tCmd.cmd != null && tCmd.data != null) return

            try {
                this.mqttClient?.publish(this.mqttTopics.commandTopic + tCmd.cmd, tCmd.data)
            } catch (err: unknown) {
                if (err instanceof Error) {
                    log.error(`Could not publish on command topic. Error: ${err.message}`)
                }
            }
        }
    }

    public sendToPanel(cmds: HMICommand | HMICommand[]) {
        if (cmds == null) return
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const self = this
        try {
            if (Array.isArray(cmds)) {
                cmds.forEach((cmd) => {
                    if (cmd != null) {
                        const data: string = NSPanelUtils.transformHmiCommand(cmd)
                        self.mqttClient?.publish(self.mqttTopics.customCommandTopic, data)
                    }
                })
            } else {
                const data = NSPanelUtils.transformHmiCommand(cmds)
                self.mqttClient?.publish(self.mqttTopics.customCommandTopic, data) // TODO: fix issue, when client was disconnecting
            }
        } catch (err: unknown) {
            if (err instanceof Error) {
                log.error(`Could not publish on mqtt client. Error: ${err.message}`)
            }
        }
    }

    private init(panelConfig: PanelConfig) {
        if (panelConfig != null) {
            // prepare and subscribe to mqtt topics
            panelConfig.mqtt.reconnectPeriod = 5000
            panelConfig.mqtt.resubscribe = true

            this.mqttTopics = this.buildMqttTopics(panelConfig.panel.fullTopic, panelConfig.panel.topic)

            try {
                this.mqttBrokerUrl = MqttUtils.getBrokerUrl(
                    panelConfig.mqtt.broker,
                    panelConfig.mqtt.port,
                    panelConfig.mqtt.useTls
                )

                this.mqttOptions = this.getMqttOptionsFromPanelConfig(panelConfig)

                const mqttClient = mqtt.connect(this.mqttBrokerUrl, this.mqttOptions)
                this.mqttClient = mqttClient

                mqttClient.on('connect', () => this.onMqttConnect())
                mqttClient.on('disconnect', () => this.onMqttDisconnect())
                mqttClient.on('reconnect', () => this.onMqttReconnect())
                mqttClient.on('message', (topic: string, payload: Buffer) => this.onMqttMessage(topic, payload))
                mqttClient.on('close', () => this.onMqttClose())
                mqttClient.on('error', (err: Error) => this.onMqttError(err))

                mqttClient.subscribe(this.mqttTopics.teleResultTopic)
                mqttClient.subscribe(this.mqttTopics.statResultTopic)
                mqttClient.subscribe(this.mqttTopics.sensorTopic)
                mqttClient.subscribe(this.mqttTopics.status2Topic)
                mqttClient.subscribe(this.mqttTopics.statUpgradeTopic)
            } catch (err: unknown) {
                if (err instanceof Error) {
                    log.error(`Could not connect to mqtt broker. Error: ${err.message}`) // TODO: better logging format
                }
            }
        } else {
            log.error(`Internal error: Invalid panel configuration (${panelConfig})`)
        }
    }

    private buildMqttTopics(fullTopic: string, panelTopic: string): MqttTopics {
        const mqttTopics = {
            commandTopic: MqttUtils.buildFullTopic(fullTopic, panelTopic, NSPanelConstants.STR_MQTT_PREFIX_CMND),

            customCommandTopic: MqttUtils.buildFullTopic(
                fullTopic,
                panelTopic,
                NSPanelConstants.STR_MQTT_PREFIX_CMND,
                NSPanelConstants.STR_MQTT_TOPIC_CUSTOMSEND
            ),
            teleResultTopic: MqttUtils.buildFullTopic(
                fullTopic,
                panelTopic,
                NSPanelConstants.STR_MQTT_PREFIX_TELE,
                NSPanelConstants.STR_MQTT_TOPIC_RESULT
            ),
            statResultTopic: MqttUtils.buildFullTopic(
                fullTopic,
                panelTopic,
                NSPanelConstants.STR_MQTT_PREFIX_STAT,
                NSPanelConstants.STR_MQTT_TOPIC_RESULT
            ),
            sensorTopic: MqttUtils.buildFullTopic(
                fullTopic,
                panelTopic,
                NSPanelConstants.STR_MQTT_PREFIX_TELE,
                NSPanelConstants.STR_MQTT_TOPIC_SENSOR
            ),

            status2Topic: MqttUtils.buildFullTopic(
                fullTopic,
                panelTopic,
                NSPanelConstants.STR_MQTT_PREFIX_STAT,
                NSPanelConstants.STR_MQTT_TOPIC_STATUS2
            ),
            statUpgradeTopic: MqttUtils.buildFullTopic(
                fullTopic,
                panelTopic,
                NSPanelConstants.STR_MQTT_PREFIX_STAT,
                NSPanelConstants.STR_MQTT_TOPIC_UPGRADE
            ),
        }
        return mqttTopics
    }

    private onMqttMessage(topic: string, payload: Buffer) {
        const payloadStr = payload?.toString()

        switch (topic) {
            case this.mqttTopics.teleResultTopic:
                this.handleTeleResultMessage(payloadStr)
                break

            case this.mqttTopics.sensorTopic:
                this.handleSensorMessage(payloadStr)
                break

            case this.mqttTopics.statResultTopic:
                this.handleStatResultMessage(payloadStr)

                break

            case this.mqttTopics.status2Topic:
                this.handleStatus2Message(payloadStr)
                break

            case this.mqttTopics.statUpgradeTopic:
                this.handleStatUpgradeMessage(payloadStr)
                break
        }
    }

    private handleTeleResultMessage(payloadStr: string): void {
        const eventArgs: EventArgs = NSPanelMessageParser.parse(payloadStr)
        if (eventArgs != null) {
            if (eventArgs.type === 'event') {
                this.emit('event', eventArgs)
            } else {
                this.emit('msg', eventArgs)
            }
        }
    }

    private handleSensorMessage(payloadStr: string): void {
        try {
            const temp = JSON.parse(payloadStr)
            const sensorEvent: SensorEventArgs | null = NSPanelMessageParser.parseSensorEvent(temp)
            if (sensorEvent != null) {
                this.emit('sensor', sensorEvent)
            }
        } catch (err: unknown) {
            if (err instanceof Error) {
                log.error(`Error processing sensor data (data=${payloadStr}): ${err.message}. Stack:`)
                log.error(err.stack)
            }
        }
    }

    private handleStatResultMessage(payloadStr: string): void {
        try {
            // TODO: consolidate into #parseStatResult ? to reduce redundant checks
            const temp = JSON.parse(payloadStr)
            if (temp != null) {
                // eslint-disable-next-line prefer-const
                for (let key in temp) {
                    switch (key) {
                        case NSPanelConstants.STR_BERRYDRIVER_CMD_UPDATEDRIVER: {
                            const bdUpdEvent: FirmwareEventArgs = NSPanelMessageParser.parseBerryDriverUpdateEvent(temp)
                            this.emit('msg', bdUpdEvent)
                            break
                        }

                        case NSPanelConstants.STR_BERRYDRIVER_CMD_FLASHNEXTION: {
                            const fwFlashEvent: FirmwareEventArgs =
                                NSPanelMessageParser.parseBerryDriverUpdateEvent(temp)
                            this.emit('msg', fwFlashEvent)
                            break
                        }

                        case NSPanelConstants.STR_TASMOTA_CMD_OTAURL: {
                            const tEvent: TasmotaEventArgs = NSPanelMessageParser.parseTasmotaCommandResult(temp)
                            this.emit('msg', tEvent)
                            break
                        }
                        // TODO: commands like SetOption73 ...

                        case NSPanelConstants.STR_BERRYDRIVER_CMD_CUSTOMSEND:
                            // drop for now... since no relevant/relatable data from HMI
                            break

                        default: {
                            const hwEvents: HardwareEventArgs[] = NSPanelMessageParser.parseHardwareEvent(temp)
                            hwEvents?.forEach((hwEventArgs) => {
                                this.emit('event', hwEventArgs)
                            })
                            break
                        }
                    }
                }
            }
        } catch (err: unknown) {
            if (err instanceof Error) {
                log.error(`Error processing sensor data (data=${payloadStr}): ${err.message}. Stack:`)
                log.error(err.stack)
            }
        }
    }

    private handleStatUpgradeMessage(payloadStr: string): void {
        try {
            const temp = JSON.parse(payloadStr)
            if (NSPanelConstants.STR_TASMOTA_MSG_UPGRADE in temp) {
                const parsedEvent: FirmwareEventArgs = NSPanelMessageParser.parseTasmotaUpgradeEvent(temp)
                if (parsedEvent != null) {
                    this.emit('msg', parsedEvent)
                }
            }
        } catch (err: unknown) {
            if (err instanceof Error) {
                log.error(`Error processing upgrade message (data=${payloadStr}): ${err.message}. Stack:`)
                log.error(err.stack)
            }
        }
    }

    private handleStatus2Message(payloadStr: string): void {
        try {
            const temp = JSON.parse(payloadStr)
            if (NSPanelConstants.STR_TASMOTA_MSG_STATUSFWR in temp) {
                const parsedEvent: FirmwareEventArgs = NSPanelMessageParser.parseTasmotaStatus2Event(temp)
                if (parsedEvent != null) {
                    this.emit('msg', parsedEvent)
                }
            }
        } catch (err: unknown) {
            if (err instanceof Error) {
                log.error(`Error processing status2 data (data=${payloadStr}): ${err.message}. Stack:`)
                log.error(err.stack)
            }
        }
    }

    // #region mqtt events
    private onMqttConnect(): void {
        this.connected = true
        log.info(
            `Connected to MQTT broker: ${this.mqttOptions.clientId ? this.mqttOptions.clientId + '@' : ''}${
                this.mqttBrokerUrl
            }`
        )
        this.emit('mqtt:connect')
    }

    private onMqttReconnect(): void {
        this.connected = false

        log.debug(
            `Reconnecting to MQTT broker: ${this.mqttOptions.clientId ? this.mqttOptions.clientId + '@' : ''}${
                this.mqttBrokerUrl
            }`
        )
        this.emit('mqtt:reconnect')
    }

    private onMqttClose(): void {
        this.connected = false

        log.info(
            `Disconnected from MQTT broker: ${this.mqttOptions.clientId ? this.mqttOptions.clientId + '@' : ''}${
                this.mqttBrokerUrl
            }`
        )
        this.emit('mqtt:close')
    }

    private onMqttDisconnect(): void {
        this.connected = false

        log.info(
            `Disconnected from MQTT broker: ${this.mqttOptions.clientId ? this.mqttOptions.clientId + '@' : ''}${
                this.mqttBrokerUrl
            }`
        )
        this.emit('mqtt:disconnect')
    }

    private onMqttError(error: Error): void {
        // the mqtt client will take care of errors
        log.debug(`MQTT client reported an error: ${error.message}`)
        this.emit('mqtt:error', error)
    }
    // #endregion mqtt events

    private getMqttOptionsFromPanelConfig(panelConfig: PanelConfig): mqtt.IClientOptions {
        const mqttOptions = {
            clientId: panelConfig.mqtt.clientId !== '' ? panelConfig.mqtt.clientId : undefined,
            username: panelConfig.mqtt.username,
            password: panelConfig.mqtt.password,
            keepalive: Number(panelConfig.mqtt.keepAlive),
            reconnectPeriod: panelConfig.mqtt.reconnectPeriod,
            resubscribe: panelConfig.mqtt.resubscribe,
        }

        return mqttOptions
    }
}
