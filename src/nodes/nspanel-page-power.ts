import { IEntityBasedPageConfig } from '../types'
import { EntitiesPageNode } from '../lib/entities-page-node'
import { DEFAULT_HMI_COLOR, STR_LUI_DELIMITER } from '../lib/nspanel-constants'
import { NSPanelUtils } from '../lib/nspanel-utils'

interface PageEntitiesConfig extends IEntityBasedPageConfig {}

const PAGE_TYPE = 'cardPower'
const MAX_ENTITIES = 8

module.exports = (RED) => {
    class PagePowerNode extends EntitiesPageNode<PageEntitiesConfig> {
        private config: PageEntitiesConfig = undefined

        constructor(config: PageEntitiesConfig) {
            super(config, RED, { pageType: PAGE_TYPE, maxEntities: MAX_ENTITIES })

            this.init(config)
        }

        private init(config: PageEntitiesConfig) {
            this.config = config
        }

        protected override generateEntities(): string {
            var resultEntities = []
            const entities = this.getEntities()
            for (var i = 0; i < this.options.maxEntities && i < entities.length; i++) {
                var entityConfig = entities[i]
                var entity = NSPanelUtils.makeEntity(
                    entityConfig.type,
                    entityConfig.entityId,
                    NSPanelUtils.getIcon(entityConfig.icon ?? ''),
                    NSPanelUtils.toHmiIconColor(entityConfig.iconColor ?? DEFAULT_HMI_COLOR),
                    entityConfig.text,
                    entityConfig.optionalValue
                )
                entity += STR_LUI_DELIMITER + 60

                resultEntities.push(entity)
            }

            return resultEntities.join('~')
        }
    }

    RED.nodes.registerType('nspanel-page-power', PagePowerNode)
}
