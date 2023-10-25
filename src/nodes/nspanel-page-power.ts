/* eslint-disable import/no-import-module-exports */
import { EntitiesPageNode } from '../lib/entities-page-node'
import { NSPanelUtils } from '../lib/nspanel-utils'
import { NSPanelColorUtils } from '../lib/nspanel-colorutils'
import { DEFAULT_LUI_COLOR, STR_LUI_DELIMITER, STR_PAGE_TYPE_CARD_POWER } from '../lib/nspanel-constants'
import { IEntityBasedPageConfig } from '../types/types'

interface PageEntitiesConfig extends IEntityBasedPageConfig {}

const MAX_ENTITIES = 8

module.exports = (RED) => {
    class PagePowerNode extends EntitiesPageNode<PageEntitiesConfig> {
        constructor(config: PageEntitiesConfig) {
            super(config, RED, { pageType: STR_PAGE_TYPE_CARD_POWER, maxEntities: MAX_ENTITIES })
        }

        protected override generateEntities(): string {
            const resultEntities: string[] = []
            const entities = this.getEntities()

            const maxEntities = this.options?.maxEntities
                ? Math.min(this.options.maxEntities, entities.length)
                : entities.length

            for (let i = 0; i < maxEntities; i += 1) {
                const entityConfig = entities[i]
                let entity = NSPanelUtils.makeEntity(
                    entityConfig.type,
                    entityConfig.entityId,
                    NSPanelUtils.getIcon(entityConfig.icon ?? ''),
                    NSPanelColorUtils.toHmiIconColor(entityConfig.iconColor ?? DEFAULT_LUI_COLOR),
                    entityConfig.text,
                    entityConfig.optionalValue
                )
                entity += STR_LUI_DELIMITER + 60

                resultEntities.push(entity)
            }

            return resultEntities.join(STR_LUI_DELIMITER)
        }
    }

    RED.nodes.registerType('nspanel-page-power', PagePowerNode)
}
