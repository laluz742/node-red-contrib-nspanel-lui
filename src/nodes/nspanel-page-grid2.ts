/* eslint-disable import/no-import-module-exports */
import { EntitiesPageNode } from '../lib/entities-page-node'
import { STR_PAGE_TYPE_CARD_GRID2 } from '../lib/nspanel-constants'
import { EntityBasedPageConfig, IPanelNodeEx } from '../types/types'

interface PageGridConfig extends EntityBasedPageConfig {}

const MAX_ENTITIES = 8
const MAX_ENTITIES_US_P = 9

module.exports = (RED) => {
    class PageGrid2Node extends EntitiesPageNode<PageGridConfig> {
        constructor(config: PageGridConfig) {
            super(config, RED, { pageType: STR_PAGE_TYPE_CARD_GRID2, maxEntities: MAX_ENTITIES })

            const panelNode = (<unknown>RED.nodes.getNode(config.nsPanel)) as IPanelNodeEx
            if (panelNode !== null) {
                const panelType = panelNode.getPanelConfig()?.panel?.panelType
                if (panelType === 'us-p') {
                    super.setMaxEntities(MAX_ENTITIES_US_P)
                }
            }
        }
    }

    RED.nodes.registerType('nspanel-page-grid2', PageGrid2Node)
}
