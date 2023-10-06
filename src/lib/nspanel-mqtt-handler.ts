import * as mqtt from 'mqtt'
import * as nEvents from 'events'

import { Logger } from './logger'
import { MqttUtils } from './mqtt-utils'
import { Nullable, PanelConfig, EventArgs, HardwareEventArgs, IPanelMqttHandler, SensorEventArgs } from '../types'
import { NSPanelMessageParser } from './nspanel-message-parser'

const log = Logger('NSPanelMqttHandler')

export class NSPanelMqttHandler extends nEvents.EventEmitter implements IPanelMqttHandler {
    private panelMqttCustomCommandTopic: string = ''
    private panelMqttCommandTopic: string = ''
    private panelMqttTeleResultTopic: string = ''
    private panelMqttStatResultTopic: string = ''
    private panelMqttSensorTopic: string = ''

    private mqttOptions: mqtt.IClientOptions = {}
    private mqttClient: Nullable<mqtt.MqttClient> = null
    private connected: boolean = false

    constructor(panelConfig: PanelConfig) {
        super()

        this.init(panelConfig)
    }

    dispose() {
        this.mqttClient?.end()
    }

    sendCommandToPanel(cmd: string, data: any) {
        // FIXME
        if (cmd === undefined || cmd === null) return

        try {
            this.mqttClient?.publish(this.panelMqttCommandTopic + cmd, data.payload) //TODO: data.payload might be empty
        } catch (err: unknown) {
            if (err instanceof Error) {
                log.error('Could not publish on command topic. Error: ' + err.message)
            }
        }
    }

    sendToPanel(data: any) {
        // FIXME: check data (payload == null | undefined...??...)
        if (data === undefined || data === null) return

        try {
            if (Array.isArray(data)) {
                data.forEach(function (temp) {
                    this.mqttClient?.publish(this.panelMqttCustomCommandTopic, temp.payload)
                })
            } else {
                this.mqttClient?.publish(this.panelMqttCustomCommandTopic, data.payload)
            }
        } catch (err: unknown) {
            if (err instanceof Error) {
                log.error('Could not publish on mqtt client. Error: ' + err.message)
            }
        }
    }

    private init(panelConfig: PanelConfig) {
        // prepare and subscribe to mqtt topics
        panelConfig.mqtt.reconnectPeriod = 5000
        panelConfig.mqtt.resubscribe = true

        //this.#panelMqttTopic = panelConfig.panel.topic
        //this.#panelMqttFullTopic = panelConfig.panel.fullTopic
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

        try {
            const brokerUrl = MqttUtils.getBrokerUrl(
                panelConfig.mqtt.broker,
                panelConfig.mqtt.port,
                panelConfig.mqtt.useTls
            )

            this.mqttOptions = this.getMqttOptionsFromPanelConfig(panelConfig)

            var mqttClient = mqtt.connect(brokerUrl, this.mqttOptions)
            this.mqttClient = mqttClient

            mqttClient.on('connect', () => this.onMqttConnect())
            mqttClient.on('reconnect', () => this.onMqttReconnect())
            mqttClient.on('message', (topic: string, payload: Buffer) => this.onMqttMessage(topic, payload))
            mqttClient.on('close', () => this.onMqttClose())
            mqttClient.on('error', (err: Error) => this.onMqttError(err))

            mqttClient.subscribe(this.panelMqttTeleResultTopic)
            mqttClient.subscribe(this.panelMqttStatResultTopic)
            mqttClient.subscribe(this.panelMqttSensorTopic)
        } catch (err: unknown) {
            if (err instanceof Error) {
                log.error('Could not connect to mqtt broker. Error: ' + err.message) //FIXME
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
        log.info('mqtt broker error' + error.message)
        log.info('mqtt broker error stack:')
        log.info(error.stack)
        this.emit('mqtt:error', error)
    }

    private onMqttMessage(topic: string, payload: Buffer) {
        const payloadStr = payload.toString()

        switch (topic) {
            case this.panelMqttTeleResultTopic:
                const eventArgs: EventArgs = NSPanelMessageParser.parse(payloadStr)
                if (eventArgs.topic === 'event') {
                    this.emit('event', eventArgs)
                } else {
                    this.emit('msg', eventArgs)
                }
                break

            case this.panelMqttSensorTopic:
                let result: SensorEventArgs
                try {
                    const temp = JSON.parse(payloadStr)
                    let sensorEvent: SensorEventArgs = NSPanelMessageParser.parseSensorEvent(temp)
                    if (sensorEvent !== null) {
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

            case this.panelMqttStatResultTopic:
                try {
                    const temp = JSON.parse(payloadStr)
                    //TODO: commands like SetOption73 ...
                    if ('CustomSend' in temp) {
                        //TODO: drop for now... since no relevant data from HMI
                    } else {
                        let parsedEvents: HardwareEventArgs[] = NSPanelMessageParser.parseHardwareEvent(temp)
                        parsedEvents?.forEach((eventArgs) => {
                            this.emit('event', eventArgs)
                        })
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
