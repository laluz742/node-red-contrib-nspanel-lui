/* eslint-disable import/no-import-module-exports */
import { PageNodeBase } from '../lib/page-node-base'
import { NSPanelColorUtils } from '../lib/nspanel-colorutils'
import { NSPanelMessageUtils } from '../lib/nspanel-message-utils'
import {
    ChartData,
    ChartDataItem,
    EntityBasedPageConfig,
    HMICommand,
    HMICommandParameters,
    InputHandlingResult,
    NodeRedSendCallback,
    PageInputMessage,
} from '../types/types'
import * as NSPanelConstants from '../lib/nspanel-constants'

type PageChartConfig = EntityBasedPageConfig & {
    lineChart: boolean
    yAxisLabel?: string
    chartColor?: string
}

module.exports = (RED) => {
    class ChartPageNode extends PageNodeBase<PageChartConfig> {
        private config: PageChartConfig

        private data: ChartData

        constructor(config: PageChartConfig) {
            config.entities = config.entities || []
            const pageType: string = config.lineChart
                ? NSPanelConstants.STR_PAGE_TYPE_CARD_LCHART
                : NSPanelConstants.STR_PAGE_TYPE_CARD_CHART

            super(config, RED, { pageType, maxEntities: 0, forceRedraw: true })

            this.config = { ...config }
        }

        protected override handleInput(msg: PageInputMessage, send: NodeRedSendCallback): InputHandlingResult {
            let inputHandled: InputHandlingResult = { handled: false, requestUpdate: false }
            let dirty = false

            switch (msg.topic) {
                case NSPanelConstants.STR_MSG_TOPIC_DATA: {
                    if (msg.payload != null && typeof msg.payload === 'object') {
                        const dTicks: number[] = []
                        const dValues: ChartDataItem[] = []
                        let dYLabel: string

                        // optional y-axis label
                        if (msg.payload['yAxisLabel'] != null) {
                            dYLabel = `${msg.payload['yAxisLabel']}`
                        }

                        // extract values
                        const values = NSPanelMessageUtils.getPropertyOrNull(msg.payload, 'values')
                        // eslint-disable-next-line prefer-const
                        for (let t in values) {
                            const val = NSPanelMessageUtils.getPropertyOrNull(values[t], 'value')
                            const label = NSPanelMessageUtils.getPropertyOrNull(values[t], 'label')
                            const valNum = val != null ? Number(val) : Number.NaN

                            if (!Number.isNaN(valNum)) {
                                const dataItem: ChartDataItem = {
                                    value: valNum,
                                }
                                if (label != null) {
                                    dataItem.label = label
                                }
                                dValues.push(dataItem)
                            }
                        }

                        const yAxisTicks: number[] = NSPanelMessageUtils.getPropertyOrNull(
                            msg.payload,
                            'yAxisTicks'
                        ) as number[]

                        // extract y-axis ticks
                        // eslint-disable-next-line prefer-const
                        for (let t in yAxisTicks) {
                            const tNum = Number(yAxisTicks[t])
                            if (!Number.isNaN(tNum)) dTicks.push(tNum)
                        }

                        dirty = dValues.length > 0
                        if (dirty) {
                            const newChartData: ChartData = {
                                values: dValues,
                                yAxisTicks: (dTicks.length > 0 ? dTicks : this.data?.yAxisTicks) ?? [],
                                yAxisLabel: dYLabel != null ? dYLabel : this.data?.yAxisLabel,
                            }
                            this.data = newChartData
                        }
                    }
                    break
                }
            }

            if (dirty) {
                inputHandled.handled = true
                inputHandled.requestUpdate = true
                this.getCache().clear()
            } else {
                inputHandled = super.handleInput(msg, send)
            }

            return inputHandled
        }

        protected override doGeneratePage(): HMICommand | null {
            const hmiCmdParams: HMICommandParameters = []

            const titleNav = this.generateTitleNav()
            const yAxisLabel = this.data?.yAxisLabel ?? this.config?.yAxisLabel
            const chartColor = NSPanelColorUtils.toHmiColor(this.config?.chartColor)
            const yTicks: string = this.data?.yAxisTicks?.join(':')

            const values: string[] = []
            // eslint-disable-next-line prefer-const
            for (let t in this.data?.values) {
                const item = this.data?.values[t]
                if (item != null && item.value != null) {
                    let v: string = `${item.value}`
                    if (item.label != null) {
                        v += `^${item.label}`
                    }
                    values.push(v)
                }
            }

            hmiCmdParams.push(this.config.title ?? NSPanelConstants.STR_EMPTY)
            hmiCmdParams.push(titleNav)
            hmiCmdParams.push(`${chartColor}`)
            hmiCmdParams.push(yAxisLabel ?? NSPanelConstants.STR_EMPTY)
            hmiCmdParams.push(yTicks ?? NSPanelConstants.STR_EMPTY)
            hmiCmdParams.push(...values)

            const hmiCmd: HMICommand = {
                cmd: NSPanelConstants.STR_LUI_CMD_ENTITYUPDATE,
                params: hmiCmdParams,
            }
            return hmiCmd
        }
    }

    RED.nodes.registerType('nspanel-page-chart', ChartPageNode)
}
