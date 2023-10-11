import { IEntityBasedPageConfig } from '../types'
import { EntitiesPageNode } from '../lib/entities-page-node'

interface PageGridConfig extends IEntityBasedPageConfig {}

const PAGE_TYPE = 'cardGrid'
const MAX_ENTITIES = 6

module.exports = (RED) => {
    class PageGridNode extends EntitiesPageNode<PageGridConfig> {
        // @ts-ignore 6133
        private config: PageGridConfig = undefined

        constructor(config: PageGridConfig) {
            super(config, RED, { pageType: PAGE_TYPE, maxEntities: MAX_ENTITIES })

            this.init(config)
        }

        private init(config: PageGridConfig) {
            this.config = config
        }
    }

    RED.nodes.registerType('nspanel-page-grid', PageGridNode)
}
