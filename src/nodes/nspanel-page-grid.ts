import { EntitiesPageNode } from '@lib/entities-page-node'
import { STR_PAGE_TYPE_CARD_GRID } from '@lib/nspanel-constants'
import { IEntityBasedPageConfig } from '@types'

interface PageGridConfig extends IEntityBasedPageConfig {}

const MAX_ENTITIES = 6

module.exports = (RED) => {
    class PageGridNode extends EntitiesPageNode<PageGridConfig> {
        // @ts-ignore 6133
        private config: PageGridConfig = undefined

        constructor(config: PageGridConfig) {
            super(config, RED, { pageType: STR_PAGE_TYPE_CARD_GRID, maxEntities: MAX_ENTITIES })

            this.init(config)
        }

        private init(config: PageGridConfig) {
            this.config = config
        }
    }

    RED.nodes.registerType('nspanel-page-grid', PageGridNode)
}
