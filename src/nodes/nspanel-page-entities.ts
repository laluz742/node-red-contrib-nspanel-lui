/* eslint-disable import/no-import-module-exports */
import { EntitiesPageNode } from '../lib/entities-page-node'
import { STR_PAGE_TYPE_CARD_ENTITIES } from '../lib/nspanel-constants'
import { IEntityBasedPageConfig } from '../types/types'

interface PageEntitiesConfig extends IEntityBasedPageConfig {}

const MAX_ENTITIES = 4

module.exports = (RED) => {
    class PageEntitiesNode extends EntitiesPageNode<PageEntitiesConfig> {
        constructor(config: PageEntitiesConfig) {
            super(config, RED, { pageType: STR_PAGE_TYPE_CARD_ENTITIES, maxEntities: MAX_ENTITIES })
        }
    }
    RED.nodes.registerType('nspanel-page-entities', PageEntitiesNode)
}
