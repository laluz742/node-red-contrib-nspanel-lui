/* eslint-disable import/no-import-module-exports */
import { EntitiesPageNode } from '../lib/entities-page-node'
import { EntityBasedPageConfig } from '../types/types'
import * as NSPanelConstants from '../lib/nspanel-constants'

type PageAlarmConfig = EntityBasedPageConfig & {}

const MAX_ENTITIES = 4

module.exports = (RED) => {
    class AlarmPageNode extends EntitiesPageNode<PageAlarmConfig> {
        private config: PageAlarmConfig

        constructor(config: PageAlarmConfig) {
            super(config, RED, { pageType: NSPanelConstants.STR_PAGE_TYPE_CARD_ALARM, maxEntities: MAX_ENTITIES })

            this.config = { ...config }
        }

        protected override doGeneratePage(): string | string[] | null {
            const result: string[] = [NSPanelConstants.STR_LUI_CMD_ENTITYUPDATE]
            result.push(this.config.title ?? '')
            const titleNav = this.generateTitleNav()
            result.push(titleNav)

            // TODO
            const entitites = this.generateEntities()
            result.push(entitites)

            return result.join(NSPanelConstants.STR_LUI_DELIMITER)
        }
    }

    RED.nodes.registerType('nspanel-page-alarm', AlarmPageNode)
}
