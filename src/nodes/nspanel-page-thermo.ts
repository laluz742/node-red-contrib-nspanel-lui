import {
    IEntityBasedPageConfig,
    PageInputMessage,
    NodeRedSendCallback,
    EventArgs,
    SensorEventArgs,
    PageEntityData,
} from '../types'
import { EntitiesPageNode } from '../lib/entities-page-node'
import { NSPanelUtils } from '../lib/nspanel-utils'
import { DEFAULT_HMI_COLOR } from '../lib/nspanel-constants'

interface PageThermoConfig extends IEntityBasedPageConfig {
    /* options */
    currentTemperatureLabel: string
    statusLabel: string
    useOwnTempSensor: boolean
    showDetailsPopup: boolean

    /* setpoints */
    targetTemperature: number
    minHeatSetpointLimit: number
    maxHeatSetpointLimit: number
    temperatureSteps: number
    temperatureUnit: string
}

interface PageThermoData {
    targetTemperature: number
    currentTemperature?: number | null
    status?: string | null
}

const PAGE_TYPE = 'cardThermo'
const MAX_ENTITIES = 8
const TEMPERATURE_RESOLUTION_FACTOR = 10
const ACTION_EMPTY = '~~~'

// TODO: second temperature in settings

/*
entityUpd
heading
navLeft[6]
navRight[6]
entityId
currentTemp
dstTemp
status
minTemp
maxTemp
tempStep
hvacAction[8] hvacAction = (icon, iconColorActive, buttonState, intName)
currentlyLabel
StateLabel 
<ignored>
tempUnit
dstTemp2
detailButton (1=hide)


 */

module.exports = (RED) => {
    class PageThermoNode extends EntitiesPageNode<PageThermoConfig> {
        private config: PageThermoConfig = undefined
        private data: PageThermoData = {
            targetTemperature: null,
            currentTemperature: null,
            status: null,
        }

        constructor(config: PageThermoConfig) {
            super(config, RED, { pageType: PAGE_TYPE, maxEntities: MAX_ENTITIES })

            this.init(config)
        }

        private init(config: PageThermoConfig) {
            this.config = config

            this.data.targetTemperature = this.config.targetTemperature
        }

        public override generatePage(): string | string[] {
            if (this.hasPageCache()) return this.getPageCache()

            var result = []
            result.push('entityUpd')

            result.push(this.entitiesPageNodeConfig.title ?? '')
            const titleNav = this.generateTitleNav()
            result.push(titleNav)

            result.push(this.config.name) //TODO: should be configurable entityId?

            const currTemp =
                this.data.currentTemperature == null || isNaN(this.data.currentTemperature)
                    ? ''
                    : this.data.currentTemperature.toFixed(1) + ' °' + this.config.temperatureUnit
            result.push(currTemp)

            result.push(this.data.targetTemperature * TEMPERATURE_RESOLUTION_FACTOR ?? 0)
            result.push(this.data.status ?? '')
            result.push(this.config.minHeatSetpointLimit * TEMPERATURE_RESOLUTION_FACTOR)
            result.push(this.config.maxHeatSetpointLimit * TEMPERATURE_RESOLUTION_FACTOR)

            const tempStep = Number(this.config.temperatureSteps) * TEMPERATURE_RESOLUTION_FACTOR //TODO: NaN check
            result.push(tempStep)

            const actions = this.generateActions()
            result.push(actions)

            result.push(this.config.currentTemperatureLabel ?? '')
            result.push(this.config.statusLabel ?? '')
            result.push('')
            result.push('°' + this.config.temperatureUnit)

            result.push('') //TODO: second target temperature

            result.push(this.config.showDetailsPopup ? '' : '1')

            const pageData = result.join('~')
            this.setPageCache(pageData)
            return pageData
        }

        protected generateActions(): string {
            var resultActions = []
            const entities = this.getEntities()

            for (var i = 0; i < this.options.maxEntities && i < entities.length; i++) {
                var entityConfig = entities[i]
                const entityData: PageEntityData = this.getEntityData(entityConfig.entityId)

                const icon = entityData?.icon ?? entityConfig.icon
                const iconColor = entityData?.iconColor ?? entityConfig.iconColor
                const value = entityData?.value

                var entity = this.makeAction(
                    entityConfig.type,
                    entityConfig.entityId,
                    NSPanelUtils.getIcon(icon ?? ''),
                    NSPanelUtils.toHmiIconColor(iconColor ?? DEFAULT_HMI_COLOR),
                    value
                )

                resultActions.push(entity)
            }
            for (; i < this.options.maxEntities; i++) {
                resultActions.push(ACTION_EMPTY)
            }

            return resultActions.join('~')
        }

        private makeAction(
            type: string,
            entityId?: string,
            icon?: string,
            iconColorActive?: number,
            state?: string | number
        ): string {
            if (type === 'delete') return ACTION_EMPTY

            return `${icon ?? ''}~${iconColorActive ?? ''}~${state ?? ''}~${entityId ?? ''}`
        }

        protected override handleInput(msg: PageInputMessage, send: NodeRedSendCallback): boolean {
            var handled = false
            var dirty = false

            switch (msg.topic) {
                case 'sensor':
                    if (this.config.useOwnTempSensor) {
                        var sensorEventArgs: SensorEventArgs = msg.payload as SensorEventArgs
                        const tempMeasurement = NSPanelUtils.convertTemperature(
                            sensorEventArgs.temp,
                            sensorEventArgs.tempUnit.toString(),
                            this.config.temperatureUnit
                        )
                        if (tempMeasurement != this.data.currentTemperature) {
                            this.data.currentTemperature = tempMeasurement
                            dirty = true
                        }
                    }
                    break

                case 'data':
                    if (!Array.isArray(msg.payload)) {
                        for (var key in msg.payload) {
                            if (this.data.hasOwnProperty(key)) {
                                this.data[key] = msg.payload[key]
                                handled = true //FIXME: there might be undhandled data
                                dirty = true
                            }
                        }
                    }
                    break

                case 'event':
                    var eventArgs: EventArgs = msg.payload as EventArgs

                    if (eventArgs.event == 'buttonPress2' && eventArgs.event2 == 'tempUpd') {
                        var tempNum = Number(eventArgs.value)
                        if (!isNaN(tempNum)) {
                            this.data.targetTemperature = tempNum / TEMPERATURE_RESOLUTION_FACTOR
                            dirty = true
                        }
                    }
            }
            if (dirty) {
                this.clearPageCache()
                this.requestUpdate()
            } else {
                handled = super.handleInput(msg, send)
            }

            return handled
        }
    }

    RED.nodes.registerType('nspanel-page-thermo', PageThermoNode)
}
