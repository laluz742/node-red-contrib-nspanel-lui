// TODO: create custom messages for events
/*
{"type":"event","date":"2023-10-30T11:59:06.965Z","event":"buttonPress2","source":"thermo","event2":"tempUpdHighLow","data":"275|280"}
{"type":"event","date":"2023-10-30T11:59:21.771Z","event":"buttonPress2","source":"thermo","event2":"tempUpd","value":225}
*/
/* eslint-disable import/no-import-module-exports */
import { EntitiesPageNode } from '../lib/entities-page-node'
import { NSPanelUtils } from '../lib/nspanel-utils'
import { NSPanelColorUtils } from '../lib/nspanel-colorutils'
import {
    EntityBasedPageConfig,
    PageInputMessage,
    NodeRedSendCallback,
    EventArgs,
    SensorEventArgs,
    PageEntityData,
    InputHandlingResult,
    HMICommand,
    HMICommandParameters,
    HardwareEventArgs,
    ThermostatEventArgs,
    PageOutputMessage,
    ThermostatData,
} from '../types/types'
import * as NSPanelConstants from '../lib/nspanel-constants'

type PageThermoConfig = EntityBasedPageConfig & {
    /* options */
    currentTemperatureLabel: string
    statusLabel: string
    useOwnTempSensor: boolean
    showDetailsPopup: boolean
    hasSecondTargetTemperature: boolean

    /* setpoints */
    targetTemperature: number
    targetTemperature2: number
    minHeatSetpointLimit: number
    maxHeatSetpointLimit: number
    temperatureSteps: number
    temperatureUnit: string

    /* thermostat */
    enableTwoPointController: boolean
    hysteresis: number
    enableTwoPointController2: boolean
    hysteresis2: number
}

type PageThermoData = {
    targetTemperature: number
    targetTemperature2: number
    currentTemperature?: number
    currentTemperature2?: number
    status?: string | null
    relayMapping: Map<string, PageEntityData[]>
}

const MAX_ENTITIES = 8
const TEMPERATURE_RESOLUTION_FACTOR = 10
const ACTION_EMPTY = NSPanelConstants.STR_LUI_DELIMITER.repeat(3)
const DEFAULT_HYSTERESIS = 1

module.exports = (RED) => {
    class PageThermoNode extends EntitiesPageNode<PageThermoConfig> {
        private config: PageThermoConfig | null = null

        private nodeNeedsRelayStates: boolean = false

        private data: PageThermoData = {
            targetTemperature: NaN,
            targetTemperature2: NaN,
            currentTemperature: null,
            currentTemperature2: null,
            status: null,
            relayMapping: new Map<string, PageEntityData[]>([
                ['power1', []],
                ['power2', []],
            ]),
        }

        constructor(config: PageThermoConfig) {
            super(config, RED, { pageType: NSPanelConstants.STR_PAGE_TYPE_CARD_THERMO, maxEntities: MAX_ENTITIES })

            this.init(config)
        }

        public override needsSensorData(): boolean {
            return this.isUseOwnSensorData()
        }

        public override needsRelayStates(): boolean {
            return this.nodeNeedsRelayStates
        }

        private init(config: PageThermoConfig) {
            this.config = config

            this.data.targetTemperature = Number(this.config.targetTemperature)
            this.data.targetTemperature2 = Number(this.config.targetTemperature2)

            this.data.relayMapping.set('power1', [])
            this.data.relayMapping.set('power2', [])

            this.getEntities()?.forEach((entity) => {
                if (entity.mappedToRelayEnabled === true) {
                    this.nodeNeedsRelayStates = true
                    const mappedRelay = Number(entity.mappedRelay)
                    if (!Number.isNaN(mappedRelay)) {
                        const mappedEntities = this.data.relayMapping.get(`power${mappedRelay}`)
                        mappedEntities?.push(entity)
                    }
                }
            })
        }

        protected isUseOwnSensorData(): boolean {
            return this.config?.useOwnTempSensor ?? false
        }

        protected onNewTemperatureReading(tempMeasurement: number, tempMeasurement2?: number, updateFlag?: boolean): void {
            if (tempMeasurement != null && !Number.isNaN(tempMeasurement)) {
                this.data.currentTemperature = Number(tempMeasurement)
            }

            if (
                tempMeasurement2 != null &&
                this.config.hasSecondTargetTemperature === true &&
                !Number.isNaN(tempMeasurement2)
            ) {
                this.data.currentTemperature2 = Number(tempMeasurement2)
            }

            if ( updateFlag ) {
                this.updateTwoPointControllers()
            }
        }

        protected updateTwoPointControllers(): void {
            const tempUnit = this.config.temperatureUnit === 'C' ? 'C' : 'F'

            if (this.config.enableTwoPointController) {
                const currentTemp = this.data.currentTemperature
                const thermoEventArgs: ThermostatEventArgs = {
                    type: 'thermostat',
                    source: this.config.name,
                    event: 'measurement',
                    tempUnit,
                    targetTemperature: this.data.targetTemperature ?? this.config.targetTemperature,
                    temperature: currentTemp,
                }

                const hysteresisNum = Number(this.config.hysteresis ?? DEFAULT_HYSTERESIS)
                const hysteresis = (Number.isNaN(hysteresisNum) ? DEFAULT_HYSTERESIS : hysteresisNum) / 2
                if (currentTemp > thermoEventArgs.targetTemperature + hysteresis) {
                    thermoEventArgs.targetTemperatureMode = 'above'
                } else if (currentTemp < thermoEventArgs.targetTemperature - hysteresis) {
                    thermoEventArgs.targetTemperatureMode = 'below'
                } else {
                    thermoEventArgs.targetTemperatureMode = 'on'
                }
                thermoEventArgs.event2 = `thermo.${thermoEventArgs.targetTemperatureMode}Target`

                const outMsg: PageOutputMessage = {
                    topic: 'event',
                    payload: thermoEventArgs,
                }
                this.emit('input', outMsg)
            }

            if (this.config.enableTwoPointController2) {
                const currentTemp = this.data.currentTemperature2
                const thermoEventArgs: ThermostatEventArgs = {
                    type: 'thermostat',
                    source: this.config.name,
                    event: 'measurement',
                    tempUnit,
                    targetTemperature: this.data.targetTemperature2 ?? this.config.targetTemperature2,
                    temperature: currentTemp,
                }

                const hysteresisNum = Number(this.config.hysteresis ?? DEFAULT_HYSTERESIS)
                const hysteresis = (Number.isNaN(hysteresisNum) ? DEFAULT_HYSTERESIS : hysteresisNum) / 2
                if (currentTemp > thermoEventArgs.targetTemperature + hysteresis) {
                    thermoEventArgs.targetTemperatureMode = 'above'
                } else if (currentTemp < thermoEventArgs.targetTemperature - hysteresis) {
                    thermoEventArgs.targetTemperatureMode = 'below'
                } else {
                    thermoEventArgs.targetTemperatureMode = 'on'
                }
                thermoEventArgs.event2 = `thermo.${thermoEventArgs.targetTemperatureMode}Target2`

                const outMsg: PageOutputMessage = {
                    topic: 'event',
                    payload: thermoEventArgs,
                }
                this.emit('input', outMsg)
            }
        }

        protected override handleInput(msg: PageInputMessage, send: NodeRedSendCallback): InputHandlingResult {
            let inputHandled: InputHandlingResult = { handled: false }
            let dirty = false

            if (msg?.payload != null) {
                switch (msg.topic) {
                    case NSPanelConstants.STR_MSG_TOPIC_HARDWARE: {
                        const hwEventArgs: HardwareEventArgs = msg.payload as HardwareEventArgs
                        const triggeredRelay = hwEventArgs?.source
                        const triggeredRelayActive = hwEventArgs?.active
                        const mappedEntities = this.data.relayMapping.get(triggeredRelay)

                        mappedEntities?.forEach((entity) => {
                            const entityData: PageEntityData = this.getEntityData(entity.entityId) ?? {}
                            entityData.value = triggeredRelayActive ? '1' : '0'
                            this.setEntityData(entity.entityId, entityData)
                            dirty = true
                        })
                        break
                    }

                    case NSPanelConstants.STR_MSG_TOPIC_SENSOR: {
                        if (this.isUseOwnSensorData()) {
                            const sensorEventArgs: SensorEventArgs = msg.payload as SensorEventArgs
                            if (sensorEventArgs.temp) {
                                const tempMeasurement = NSPanelUtils.convertTemperature(
                                    sensorEventArgs.temp,
                                    sensorEventArgs.tempUnit?.toString() ?? '',
                                    this.config.temperatureUnit
                                )
                                if (tempMeasurement !== this.data.currentTemperature) {
                                    dirty = true
                                }
                                this.onNewTemperatureReading(tempMeasurement, null, dirty)
                            }
                        }
                        break
                    }

                    case NSPanelConstants.STR_MSG_TOPIC_THERMO: {
                        if (!Array.isArray(msg.payload)) {
                            const thermoData: ThermostatData = msg.payload as ThermostatData
                            const tempUnit = thermoData?.tempUnit

                            // handle new target temperatures
                            const targetTemperature: number = Number(thermoData?.targetTemperature ?? Number.NaN)
                            const targetTemperature2: number = Number(thermoData?.targetTemperature2 ?? Number.NaN)
                            if (!Number.isNaN(targetTemperature)) {
                                this.data.targetTemperature = NSPanelUtils.convertTemperature(
                                    targetTemperature,
                                    tempUnit ?? this.config.temperatureUnit,
                                    this.config.temperatureUnit
                                )
                                dirty = true
                            }
                            if (!Number.isNaN(targetTemperature2)) {
                                this.data.targetTemperature2 = NSPanelUtils.convertTemperature(
                                    targetTemperature2,
                                    tempUnit ?? this.config.temperatureUnit,
                                    this.config.temperatureUnit
                                )
                                dirty = true
                            }

                            // handle temperature measurements
                            const currentTemperature: number = Number(thermoData?.temperature ?? Number.NaN)
                            const currentTemperature2: number = Number(thermoData?.temperature2 ?? Number.NaN)

                            let temp
                            let temp2

                            if (!Number.isNaN(currentTemperature)) {
                                temp = NSPanelUtils.convertTemperature(
                                    currentTemperature,
                                    tempUnit ?? this.config.temperatureUnit,
                                    this.config.temperatureUnit
                                )
                                if (temp !== this.data.currentTemperature) {
                                    dirty = true
                                }
                            }

                            if (!Number.isNaN(currentTemperature2)) {
                                temp2 = NSPanelUtils.convertTemperature(
                                    currentTemperature2,
                                    tempUnit ?? this.config.temperatureUnit,
                                    this.config.temperatureUnit
                                )
                                if (temp2 !== this.data.currentTemperature2) {
                                    dirty = true
                                }
                            }
                            this.onNewTemperatureReading(temp, temp2, dirty)
                        }
                        break
                    }

                    case NSPanelConstants.STR_MSG_TOPIC_DATA: {
                        if (!Array.isArray(msg.payload)) {
                            // eslint-disable-next-line prefer-const
                            for (let key in msg.payload) {
                                if (Object.prototype.hasOwnProperty.call(this.data, key)) {
                                    this.data[key] = msg.payload[key]
                                    inputHandled.handled = true // TODO: there might be undhandled data
                                    dirty = true
                                }
                            }
                        }
                        break
                    }

                    case NSPanelConstants.STR_MSG_TOPIC_EVENT: {
                        const eventArgs: EventArgs = msg.payload as EventArgs

                        if (
                            eventArgs.event === NSPanelConstants.STR_LUI_EVENT_BUTTONPRESS2 &&
                            eventArgs.event2 === 'tempUpd'
                        ) {
                            const tempNum = Number(eventArgs.value)
                            if (!Number.isNaN(tempNum)) {
                                this.data.targetTemperature = tempNum / TEMPERATURE_RESOLUTION_FACTOR
                                dirty = true
                            }
                        }
                    }
                }
            }

            if (dirty) {
                this.getCache().clear()
                inputHandled.requestUpdate = true
            } else {
                inputHandled = super.handleInput(msg, send)
            }

            return inputHandled
        }

        // #region page generation
        protected override doGeneratePage(): HMICommand | null {
            const result: HMICommandParameters = []

            const titleNav = this.generateTitleNav()
            const currTemp =
                this.data.currentTemperature == null || Number.isNaN(this.data.currentTemperature)
                    ? ''
                    : `${this.data.currentTemperature.toFixed(1)} °${this.config?.temperatureUnit}`

            const targetTemp = this.data.targetTemperature * TEMPERATURE_RESOLUTION_FACTOR ?? 0
            const targetTemp2 = this.data.targetTemperature2 * TEMPERATURE_RESOLUTION_FACTOR ?? 0

            const minHeatSetPoint: number = (this.config?.minHeatSetpointLimit ?? 0) * TEMPERATURE_RESOLUTION_FACTOR
            const maxHeatSetPoint: number = (this.config?.maxHeatSetpointLimit ?? 0) * TEMPERATURE_RESOLUTION_FACTOR
            const tempStep = Number(this.config?.temperatureSteps) * TEMPERATURE_RESOLUTION_FACTOR // TODO: NaN check
            const actions = this.generateActions()

            result.push(this.entitiesPageNodeConfig.title ?? '')
            result.push(titleNav)
            result.push(this.config?.name ?? '') // TODO: should be configurable entityId?

            result.push(currTemp)
            result.push(targetTemp.toString())
            result.push(this.data.status ?? NSPanelConstants.STR_EMPTY)
            result.push(minHeatSetPoint.toString())
            result.push(maxHeatSetPoint.toString())
            result.push(tempStep.toString())

            result.push(actions)

            result.push(this.config?.currentTemperatureLabel ?? NSPanelConstants.STR_EMPTY)
            result.push(this.config?.statusLabel ?? NSPanelConstants.STR_EMPTY)
            result.push(NSPanelConstants.STR_EMPTY)
            result.push(`°${this.config?.temperatureUnit}`)

            result.push(
                (this.config?.hasSecondTargetTemperature ? targetTemp2.toString() : NSPanelConstants.STR_EMPTY) ??
                    NSPanelConstants.STR_EMPTY
            )

            result.push(this.config?.showDetailsPopup ? NSPanelConstants.STR_EMPTY : '1')

            const hmiCmd: HMICommand = {
                cmd: NSPanelConstants.STR_LUI_CMD_ENTITYUPDATE,
                params: result,
            }
            return hmiCmd
        }

        protected generateActions(): string {
            const resultActions: string[] = []
            const entities = this.getEntities()
            let i

            for (i = 0; (this.options ? i < this.options.maxEntities : true) && i < entities.length; i += 1) {
                const entityConfig = entities[i]
                const entityData: PageEntityData | null = this.getEntityData(entityConfig.entityId)

                const icon = entityData?.icon ?? entityConfig.icon
                const iconColor = entityData?.iconColor ?? entityConfig.iconColor
                const value = entityData?.value

                const entity = this._renderAction(
                    entityConfig.type,
                    entityConfig.entityId,
                    NSPanelUtils.getIcon(icon ?? ''),
                    NSPanelColorUtils.toHmiColor(iconColor),
                    value
                )

                resultActions.push(entity)
            }
            if (this.options) {
                for (; i < this.options.maxEntities; i += 1) {
                    resultActions.push(ACTION_EMPTY)
                }
            }

            return resultActions.join(NSPanelConstants.STR_LUI_DELIMITER) // FIXME: HMICommandParameters
        }

        private _renderAction(
            type: string,
            entityId?: string,
            icon?: string,
            iconColorActive?: number,
            state?: string | number
        ): string {
            if (type === NSPanelConstants.STR_LUI_ENTITY_NONE) return ACTION_EMPTY

            return `${icon ?? ''}${NSPanelConstants.STR_LUI_DELIMITER}${iconColorActive ?? ''}${
                NSPanelConstants.STR_LUI_DELIMITER
            }${state ?? ''}${NSPanelConstants.STR_LUI_DELIMITER}${entityId ?? ''}`
        }

        // #endregion page generation
    }

    RED.nodes.registerType('nspanel-page-thermo', PageThermoNode)
}
