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
}

type PageThermoData = {
    targetTemperature: number
    targetTemperature2: number
    currentTemperature?: number | null
    status?: string | null
    relayMapping: Map<string, PageEntityData[]>
}

const MAX_ENTITIES = 8
const TEMPERATURE_RESOLUTION_FACTOR = 10
const ACTION_EMPTY = NSPanelConstants.STR_LUI_DELIMITER.repeat(3)

module.exports = (RED) => {
    class PageThermoNode extends EntitiesPageNode<PageThermoConfig> {
        private config: PageThermoConfig | null = null

        private data: PageThermoData = {
            targetTemperature: NaN,
            targetTemperature2: NaN,
            currentTemperature: null,
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

        private init(config: PageThermoConfig) {
            this.config = config

            this.data.targetTemperature = this.config.targetTemperature
            this.data.targetTemperature2 = this.config.targetTemperature2

            this.data.relayMapping.set('power1', [])
            this.data.relayMapping.set('power2', [])

            this.getEntities()?.forEach((entity) => {
                if (entity.mappedToRelayEnabled === true) {
                    const mappedRelay = Number(entity.mappedRelay)
                    if (!Number.isNaN(mappedRelay)) {
                        const mappedEntities = this.data.relayMapping.get(`power${mappedRelay + 1}`)
                        mappedEntities?.push(entity)
                    }
                }
            })
        }

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

        protected isUseOwnSensorData(): boolean {
            return this.config?.useOwnTempSensor ?? false
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
                    NSPanelColorUtils.toHmiColor(iconColor ?? NSPanelConstants.DEFAULT_LUI_COLOR),
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

        protected override handleInput(msg: PageInputMessage, send: NodeRedSendCallback): InputHandlingResult {
            let inputHandled: InputHandlingResult = { handled: false }
            let dirty = false

            switch (msg.topic) {
                case NSPanelConstants.STR_MSG_TOPIC_HARDWARE: {
                    const hwEventArgs: HardwareEventArgs = msg.payload as HardwareEventArgs
                    const triggeredRelay = hwEventArgs.source
                    const triggeredRelayActive = hwEventArgs.active
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
                                this.data.currentTemperature = tempMeasurement
                                dirty = true
                            }
                        }
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
            if (dirty) {
                this.getCache().clear()
                inputHandled.requestUpdate = true
            } else {
                inputHandled = super.handleInput(msg, send)
            }

            return inputHandled
        }
    }

    RED.nodes.registerType('nspanel-page-thermo', PageThermoNode)
}
