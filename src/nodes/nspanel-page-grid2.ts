/* eslint-disable import/no-import-module-exports */
import { EntitiesPageNode } from '../lib/entities-page-node'
import { STR_PAGE_TYPE_CARD_GRID2 } from '../lib/nspanel-constants'
import { EntityBasedPageConfig } from '../types/types'

interface PageGridConfig extends EntityBasedPageConfig {}

const MAX_ENTITIES = 8

module.exports = (RED) => {
    class PageGrid2Node extends EntitiesPageNode<PageGridConfig> {
        constructor(config: PageGridConfig) {
            super(config, RED, { pageType: STR_PAGE_TYPE_CARD_GRID2, maxEntities: MAX_ENTITIES })
        }
    }

    RED.nodes.registerType('nspanel-page-grid2', PageGrid2Node)
}
