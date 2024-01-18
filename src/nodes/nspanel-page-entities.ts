/* eslint-disable import/no-import-module-exports */
import { EntitiesPageNode } from '../lib/entities-page-node'
import { STR_PAGE_TYPE_CARD_ENTITIES } from '../lib/nspanel-constants'
import { EntityBasedPageConfig, IPanelNodeEx } from '../types/types'

interface PageEntitiesConfig extends EntityBasedPageConfig {}

const MAX_ENTITIES = 4

module.exports = (RED) => {
    class PageEntitiesNode extends EntitiesPageNode<PageEntitiesConfig> {
        constructor(config: PageEntitiesConfig) {
            super(config, RED, { pageType: STR_PAGE_TYPE_CARD_ENTITIES, maxEntities: MAX_ENTITIES })

            const panelNode = (<unknown>RED.nodes.getNode(config.nsPanel)) as IPanelNodeEx
            if (panelNode !== null) {
                const panelType = panelNode.getPanelConfig()?.panel?.panelType
                if (panelType === 'us-p') {
                    super.setMaxEntities(6)
                }
            }
        }
    }
    RED.nodes.registerType('nspanel-page-entities', PageEntitiesNode)
}
