import { PageNode } from '../lib/page-node'
import { EventArgs, EventMapping, IPageConfig, NodeRedSendCallback, PageInputMessage, StatusItemData } from '../types'
import { NSPanelUtils } from '../lib/nspanel-utils'
import { NSPanelMessageUtils } from '../lib/nspanel-message-utils'
import { STR_LUI_DELIMITER } from '../lib/nspanel-constants'
import { NSPanelColorUtils } from '../lib/nspanel-colorutils'

interface ScreenSaverConfig extends IPageConfig {
    doubleTapToExit: boolean
}

const MAX_ENTITIES = 6

module.exports = (RED) => {
    class ScreenSaverNode extends PageNode<ScreenSaverConfig> {
        private config: ScreenSaverConfig
        protected statusData: StatusItemData[] = []

        constructor(config: ScreenSaverConfig) {
            super(config, RED, { pageType: 'screensaver', maxEntities: MAX_ENTITIES })

            this.config = config
        }

        public isScreenSaver() {
            return true
        }

        protected override handleInput(msg: PageInputMessage, _send: NodeRedSendCallback): boolean {
            if (!NSPanelMessageUtils.hasProperty(msg, 'topic')) return false

            switch (msg.topic) {
                case 'status':
                    this.handleStatusInput(msg)
                    this.requestUpdate()
                    return true
            }

            return false
        }

        protected override doGeneratePage(): string | string[] | null {
            var result: string[] = []

            const statusUpdate = this.generateStatusUpdate()
            if (statusUpdate) result.push(statusUpdate)

            const weatherUpdate = this.generateWeatherUpdate()
            if (weatherUpdate) result.push(weatherUpdate)

            return result
        }

        public prePageNavigationEvent(eventArgs: EventArgs, _eventConfig: EventMapping) {
            if (eventArgs.event2 == 'bExit' && this.config.doubleTapToExit) {
                return eventArgs.value ? eventArgs.value >= 2 : false
            }

            return true
        }

        private generateStatusUpdate() {
            if (this.statusData.length == 0) {
                return null
            }

            var cmd = 'statusUpdate' + STR_LUI_DELIMITER
            var cmdParams: string[] = []

            for (var idx = 0; idx < 2; idx++) {
                const item = this.statusData[idx]
                var tmp: string =
                    item !== undefined
                        ? NSPanelUtils.makeIcon(
                              (item.prefix ?? '') + NSPanelUtils.getIcon(item.icon) + (item.text ?? ''),
                              item.iconColor
                          )
                        : NSPanelUtils.makeIcon(null, null)
                cmdParams.push(tmp)
            }
            cmd += cmdParams.join(STR_LUI_DELIMITER)
            return cmd
        }

        private generateWeatherUpdate() {
            if (this.pageData.entities.length == 0) {
                return null
            }

            var result = 'weatherUpdate' + STR_LUI_DELIMITER
            var resultEntities: string[] = []
            const data = this.pageData.entities

            for (var i in data) {
                const item = data[i]
                var entity = NSPanelUtils.makeEntity(
                    '',
                    '',
                    NSPanelUtils.getIcon(item.icon),
                    NSPanelColorUtils.toHmiIconColor(item.iconColor ?? NaN),
                    item.text,
                    item.value
                )
                resultEntities.push(entity)
            }

            result += resultEntities.join(STR_LUI_DELIMITER)
            return result
        }

        private handleStatusInput(msg: PageInputMessage): void {
            if (msg.payload === undefined) return

            //TODO: take msg.parts into account to allow to set specific status
            const statusInputData = msg.payload
            var statusItems: StatusItemData[] = this.statusData.map((item) => item)

            if (Array.isArray(statusInputData)) {
                for (var i = 0; i < 2; i++) {
                    if (statusInputData[i] !== undefined) {
                        const item: StatusItemData = NSPanelMessageUtils.convertToStatusItemData(
                            statusInputData[i]
                        ) as StatusItemData
                        const idx = NSPanelMessageUtils.getPropertyOrDefault(item, 'index', i)
                        statusItems[idx] = item
                    }
                }
            } else {
                if (statusInputData !== undefined) {
                    const item = NSPanelMessageUtils.convertToStatusItemData(statusInputData) as StatusItemData
                    const idx = NSPanelMessageUtils.getPropertyOrDefault(item, 'index', 0)
                    statusItems[idx] = item
                }
            }

            this.statusData = statusItems
        }
    }

    RED.nodes.registerType('nspanel-screensaver', ScreenSaverNode)
}
