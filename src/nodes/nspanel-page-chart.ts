/* eslint-disable import/no-import-module-exports */
import { PageNode } from '../lib/page-node'
import { NSPanelColorUtils } from '../lib/nspanel-colorutils'
import { NSPanelMessageUtils } from '../lib/nspanel-message-utils'
import { ChartData, ChartDataItem, EntityBasedPageConfig, NodeRedSendCallback, PageInputMessage } from '../types/types'
import * as NSPanelPanelConstants from '../lib/nspanel-constants'

type PageChartConfig = EntityBasedPageConfig & {
    lineChart: boolean
    yAxisLabel?: string
    chartColor?: string
}

module.exports = (RED) => {
    class ChartPageNode extends PageNode<PageChartConfig> {
        private config: PageChartConfig

        private data: ChartData

        constructor(config: PageChartConfig) {
            config.entities = config.entities || []
            const pageType: string = config.lineChart
                ? NSPanelPanelConstants.STR_PAGE_TYPE_CARD_LCHART
                : NSPanelPanelConstants.STR_PAGE_TYPE_CARD_CHART

            super(config, RED, { pageType, maxEntities: 0, forceRedraw: true })

            this.config = { ...config }
        }

        protected override handleInput(msg: PageInputMessage, send: NodeRedSendCallback): boolean {
            let handled = false
            let dirty = false

            switch (msg.topic) {
                case NSPanelPanelConstants.STR_MSG_TOPIC_DATA: {
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
                handled = true
                this.getCache().clear()
            } else {
                handled = super.handleInput(msg, send)
            }

            return handled
        }

        protected override doGeneratePage(): string | string[] | null {
            const result: string[] = [NSPanelPanelConstants.STR_LUI_CMD_ENTITYUPDATE]
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

            result.push(this.config.title ?? NSPanelPanelConstants.STR_EMPTY)
            result.push(titleNav)
            result.push(`${chartColor}`)
            result.push(yAxisLabel ?? NSPanelPanelConstants.STR_EMPTY)
            result.push(yTicks ?? NSPanelPanelConstants.STR_EMPTY)
            result.push(...values)

            return result.join(NSPanelPanelConstants.STR_LUI_DELIMITER)
        }
    }

    RED.nodes.registerType('nspanel-page-chart', ChartPageNode)
}
