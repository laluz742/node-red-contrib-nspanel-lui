import { IEntityBasedPageConfig } from '../types'
import { EntitiesPageNode } from '../lib/entities-page-node'
import { DEFAULT_LUI_COLOR, STR_LUI_DELIMITER, STR_PAGE_TYPE_CARD_POWER } from '../lib/nspanel-constants'
import { NSPanelUtils } from '../lib/nspanel-utils'
import { NSPanelColorUtils } from '../lib/nspanel-colorutils'

interface PageEntitiesConfig extends IEntityBasedPageConfig {}

const MAX_ENTITIES = 8

module.exports = (RED) => {
    class PagePowerNode extends EntitiesPageNode<PageEntitiesConfig> {
        // @ts-ignore 6133
        private config: PageEntitiesConfig = undefined

        constructor(config: PageEntitiesConfig) {
            super(config, RED, { pageType: STR_PAGE_TYPE_CARD_POWER, maxEntities: MAX_ENTITIES })

            this.init(config)
        }

        private init(config: PageEntitiesConfig) {
            this.config = config
        }

        protected override generateEntities(): string {
            var resultEntities: string[] = []
            const entities = this.getEntities()
            for (var i = 0; this.options ? i < this.options.maxEntities : true && i < entities.length; i++) {
                var entityConfig = entities[i]
                var entity = NSPanelUtils.makeEntity(
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
