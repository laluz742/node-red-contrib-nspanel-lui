import { PageNode } from '../lib/page-node'
import { EventArgs, EventMapping, IPageConfig, NodeRedSendCallback, PageInputMessage, StatusItemData } from '../types'
import { NSPanelUtils } from '../lib/nspanel-utils'
import { NSPanelMessageUtils } from '../lib/nspanel-message-utils'

interface ScreenSaverConfig extends IPageConfig {
    doubleTapToExit: boolean
}

const MAX_ENTITIES = 6

module.exports = (RED) => {
    class ScreenSaverNode extends PageNode<ScreenSaverConfig> {
        private config: ScreenSaverConfig
        protected statusData: StatusItemData[] = [undefined, undefined]

        constructor(config: ScreenSaverConfig) {
            super(config, RED, { pageType: 'screensaver', maxEntities: MAX_ENTITIES })

            this.config = config
        }

        public isScreenSaver() {
            return true
        }

        protected override handleInput(msg: PageInputMessage, send: NodeRedSendCallback): boolean {
            if (!NSPanelMessageUtils.hasProperty(msg, 'topic')) return false

            switch (msg.topic) {
                case 'status':
                    this.handleStatusInput(msg)
                    this.requestUpdate()
                    return true
            }

            return false
        }

        public generatePage(): string | string[] {
            var result = []

            const statusUpdate = this.generateStatusUpdate()
            if (statusUpdate) result.push(statusUpdate)

            const weatherUpdate = this.generateWeatherUpdate()
            if (weatherUpdate) result.push(weatherUpdate)

            return result
        }

        public prePageNavigationEvent(eventArgs: EventArgs, eventConfig: EventMapping) {
            if (eventArgs.event2 == 'bExit' && this.config.doubleTapToExit) {
                return eventArgs.value >= 2
            }

            return true
        }

        private generateStatusUpdate() {
            if (this.statusData.length == 0) {
                return null
            }

            var cmd = 'statusUpdate~'
            var cmdParams = []

            const data = this.statusData
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
            cmd += cmdParams.join('~')
            return cmd
        }

        private generateWeatherUpdate() {
            if (this.pageData.entities.length == 0) {
                return null
            }

            var result = 'weatherUpdate~'
            var resultEntities = []
            const data = this.pageData.entities

            for (var i in data) {
                const item = data[i]
                var entity = NSPanelUtils.makeEntity(
                    '',
                    '',
                    NSPanelUtils.getIcon(item.icon),
                    NSPanelUtils.toHmiIconColor(item.iconColor),
                    item.text,
                    item.value
                )
                resultEntities.push(entity)
            }

            result += resultEntities.join('~')
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
                        const item = NSPanelMessageUtils.convertToStatusItemData(statusInputData[i])
                        const idx = NSPanelMessageUtils.getPropertyOrDefault(item, 'index', i)
                        statusItems[idx] = item
                    }
                }
            } else {
                if (statusInputData !== undefined) {
                    const item = NSPanelMessageUtils.convertToStatusItemData(statusInputData)
                    const idx = NSPanelMessageUtils.getPropertyOrDefault(item, 'index', 0)
                    statusItems[idx] = item
                }
            }

            this.statusData = statusItems
        }
    }

    RED.nodes.registerType('nspanel-screensaver', ScreenSaverNode)
}
