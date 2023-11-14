import * as mqtt from 'mqtt'
import * as nEvents from 'events'

import { Logger } from './logger'
import { MqttUtils } from './mqtt-utils'
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
import { NSPanelUtils } from './nspanel-utils'

const log = Logger('NSPanelMqttHandler')

export class NSPanelMqttHandler extends nEvents.EventEmitter implements IPanelMqttHandler {
    private panelMqttCustomCommandTopic: string = null

    private panelMqttCommandTopic: string = null

    private panelMqttTeleResultTopic: string = null

    private panelMqttStatResultTopic: string = null

    private panelMqttStatUpgradeTopic: string = null

    private panelMqttSensorTopic: string = null

    private panelMqttStatus2Topic: string = null

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
        if (tCmd == null && tCmd.cmd != null && tCmd.data != null) return

        try {
            this.mqttClient?.publish(this.panelMqttCommandTopic + tCmd.cmd, tCmd.data)
        } catch (err: unknown) {
            if (err instanceof Error) {
                log.error(`Could not publish on command topic. Error: ${err.message}`)
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
                        self.mqttClient?.publish(self.panelMqttCustomCommandTopic, data)
                    }
                })
            } else {
                const data = NSPanelUtils.transformHmiCommand(cmds)
                self.mqttClient?.publish(self.panelMqttCustomCommandTopic, data) // TODO: fix issue, when client was disconnecting
            }
        } catch (err: unknown) {
            if (err instanceof Error) {
                log.error(`Could not publish on mqtt client. Error: ${err.message}`)
            }
        }
    }

    private init(panelConfig: PanelConfig) {
        // prepare and subscribe to mqtt topics
        panelConfig.mqtt.reconnectPeriod = 5000
        panelConfig.mqtt.resubscribe = true

        this.panelMqttCommandTopic = MqttUtils.buildFullTopic(
            panelConfig.panel.fullTopic,
            panelConfig.panel.topic,
            'cmnd'
        )

        this.panelMqttCustomCommandTopic = MqttUtils.buildFullTopic(
            panelConfig.panel.fullTopic,
            panelConfig.panel.topic,
            'cmnd',
            'CustomSend'
        )
        this.panelMqttTeleResultTopic = MqttUtils.buildFullTopic(
            panelConfig.panel.fullTopic,
            panelConfig.panel.topic,
            'tele',
            'RESULT'
        )
        this.panelMqttStatResultTopic = MqttUtils.buildFullTopic(
            panelConfig.panel.fullTopic,
            panelConfig.panel.topic,
            'stat',
            'RESULT'
        )
        this.panelMqttSensorTopic = MqttUtils.buildFullTopic(
            panelConfig.panel.fullTopic,
            panelConfig.panel.topic,
            'tele',
            'SENSOR'
        )

        this.panelMqttStatus2Topic = MqttUtils.buildFullTopic(
            panelConfig.panel.fullTopic,
            panelConfig.panel.topic,
            'stat',
            'STATUS2'
        )
        this.panelMqttStatUpgradeTopic = MqttUtils.buildFullTopic(
            panelConfig.panel.fullTopic,
            panelConfig.panel.topic,
            'stat',
            'UPGRADE'
        )

        try {
            const brokerUrl = MqttUtils.getBrokerUrl(
                panelConfig.mqtt.broker,
                panelConfig.mqtt.port,
                panelConfig.mqtt.useTls
            )

            this.mqttOptions = this.getMqttOptionsFromPanelConfig(panelConfig)

            const mqttClient = mqtt.connect(brokerUrl, this.mqttOptions)
            this.mqttClient = mqttClient

            mqttClient.on('connect', () => this.onMqttConnect())
            mqttClient.on('reconnect', () => this.onMqttReconnect())
            mqttClient.on('message', (topic: string, payload: Buffer) => this.onMqttMessage(topic, payload))
            mqttClient.on('close', () => this.onMqttClose())
            mqttClient.on('error', (err: Error) => this.onMqttError(err))

            mqttClient.subscribe(this.panelMqttTeleResultTopic)
            mqttClient.subscribe(this.panelMqttStatResultTopic)
            mqttClient.subscribe(this.panelMqttSensorTopic)
            mqttClient.subscribe(this.panelMqttStatus2Topic)
            mqttClient.subscribe(this.panelMqttStatUpgradeTopic)
        } catch (err: unknown) {
            if (err instanceof Error) {
                log.error(`Could not connect to mqtt broker. Error: ${err.message}`) // TODO: better logging format
            }
        }
    }

    private onMqttMessage(topic: string, payload: Buffer) {
        const payloadStr = payload.toString()

        switch (topic) {
            case this.panelMqttTeleResultTopic: {
                const eventArgs: EventArgs = NSPanelMessageParser.parse(payloadStr)
                if (eventArgs != null) {
                    if (eventArgs.type === 'event') {
                        this.emit('event', eventArgs)
                    } else {
                        this.emit('msg', eventArgs)
                    }
                }
                break
            }

            case this.panelMqttSensorTopic: {
                try {
                    const temp = JSON.parse(payloadStr)
                    const sensorEvent: SensorEventArgs | null = NSPanelMessageParser.parseSensorEvent(temp)
                    if (sensorEvent != null) {
                        this.emit('sensor', sensorEvent)
                    }
                } catch (err: unknown) {
                    if (err instanceof Error) {
                        log.error(`Error processing sensor data (data=${payloadStr}): ${err.message}`)
                        log.error('Stack:')
                        log.error(err.stack)
                    }
                }
                break
            }

            case this.panelMqttStatResultTopic: {
                try {
                    // TODO: consolidate into #parseStatResult ? to reduce redundant checks
                    const temp = JSON.parse(payloadStr)
                    if (temp != null) {
                        // eslint-disable-next-line prefer-const
                        for (let key in temp) {
                            switch (key) {
                                case NSPanelConstants.STR_BERRYDRIVER_CMD_UPDATEDRIVER: {
                                    const bdUpdEvent: FirmwareEventArgs =
                                        NSPanelMessageParser.parseBerryDriverUpdateEvent(temp)
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
                                    const tEvent: TasmotaEventArgs =
                                        NSPanelMessageParser.parseTasmotaCommandResult(temp)
                                    this.emit('msg', tEvent)
                                    break
                                }
                                // TODO: commands like SetOption73 ...

                                case 'CustomSend':
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
                        log.error(`Error processing sensor data (data=${payloadStr}): ${err.message}`)
                        log.error('Stack:')
                        log.error(err.stack)
                    }
                }
                break
            }

            case this.panelMqttStatus2Topic: {
                try {
                    const temp = JSON.parse(payloadStr)
                    if ('StatusFWR' in temp) {
                        const parsedEvent: FirmwareEventArgs = NSPanelMessageParser.parseTasmotaStatus2Event(temp)
                        if (parsedEvent != null) {
                            this.emit('msg', parsedEvent)
                        }
                    }
                } catch (err: unknown) {
                    if (err instanceof Error) {
                        log.error(`Error processing status2 data (data=${payloadStr}): ${err.message}`)
                        log.error('Stack:')
                        log.error(err.stack)
                    }
                }
                break
            }

            case this.panelMqttStatUpgradeTopic: {
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
                        log.error(`Error processing upgrade message (data=${payloadStr}): ${err.message}`)
                        log.error('Stack:')
                        log.error(err.stack)
                    }
                }
                break
            }
        }
    }

    private onMqttConnect(): void {
        this.connected = true
        log.info('mqtt broker connected')
        this.emit('mqtt:connect')
    }

    private onMqttReconnect(): void {
        this.connected = false
        log.info('mqtt broker reconnect')
        this.emit('mqtt:reconnect')
    }

    private onMqttClose(): void {
        if (this.connected) {
            this.connected = false
        }

        log.info('mqtt broker disconnected')
        this.emit('mqtt:close')
    }

    private onMqttError(error: Error): void {
        log.error(`mqtt broker error${error.message}`)
        log.error('mqtt broker error stack:')
        log.error(error.stack)
        this.emit('mqtt:error', error)
    }

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
