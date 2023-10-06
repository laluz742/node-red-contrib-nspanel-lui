import { IEntityBasedPageConfig } from '../types'
import { EntitiesPageNode } from '../lib/entities-page-node'

interface PageEntitiesConfig extends IEntityBasedPageConfig {}

const PAGE_TYPE = 'cardEntities'
const MAX_ENTITIES = 4

module.exports = (RED) => {
    class PageEntitiesNode extends EntitiesPageNode<PageEntitiesConfig> {
        private config: PageEntitiesConfig = undefined

        constructor(config: PageEntitiesConfig) {
            super(config, RED, { pageType: PAGE_TYPE, maxEntities: MAX_ENTITIES })

            this.init(config)
        }

        private init(config: PageEntitiesConfig) {
            this.config = config
        }
    }

    RED.nodes.registerType('nspanel-page-entities', PageEntitiesNode)
}
