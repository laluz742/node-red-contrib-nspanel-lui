import { EntitiesPageNode } from '@lib/entities-page-node'
import { STR_PAGE_TYPE_CARD_ENTITIES } from '@lib/nspanel-constants'
import { IEntityBasedPageConfig } from '@types'

interface PageEntitiesConfig extends IEntityBasedPageConfig {}

const MAX_ENTITIES = 4

module.exports = (RED) => {
    class PageEntitiesNode extends EntitiesPageNode<PageEntitiesConfig> {
        // @ts-ignore 6133
        private config: PageEntitiesConfig = undefined

        constructor(config: PageEntitiesConfig) {
            super(config, RED, { pageType: STR_PAGE_TYPE_CARD_ENTITIES, maxEntities: MAX_ENTITIES })

            this.init(config)
        }

        private init(config: PageEntitiesConfig) {
            this.config = config
        }
    }

    RED.nodes.registerType('nspanel-page-entities', PageEntitiesNode)
}
