import { IEntityBasedPageConfig, PageCacheData } from '../types'
import { EntitiesPageNode } from '../lib/entities-page-node'
import { STR_CMD_LUI_ENTITYUPDATE, STR_LUI_DELIMITER, STR_PAGE_TYPE_CARD_QR } from '../lib/nspanel-constants'

interface PageQRConfig extends IEntityBasedPageConfig {
    qrCode: string | undefined
}

const MAX_ENTITIES = 2
const EMPTY_ENTITY: PanelEntity = {
    type: 'text',
    entityId: 'text.'
}

module.exports = (RED) => {
    class QrPageNode extends EntitiesPageNode<PageQRConfig> {
        private config: PageQRConfig
        private pageCache: PageCacheData = null

        constructor(config: PageQRConfig) {
            config.entities = config.entities || []

            if (config.entities.length < MAX_ENTITIES) {
                for (var i = 0; i < MAX_ENTITIES - config.entities.length; i++) {
                    const entityFill = Object.assign({}, EMPTY_ENTITY)
                    entityFill.entityId += +i
                    config.entities.push(entityFill)
                }
            }

            super(config, RED, { pageType: STR_PAGE_TYPE_CARD_QR, maxEntities: MAX_ENTITIES })

            this.config = Object.assign({}, config)
        }

        generatePage(): string | string[] {
            if (this.pageCache !== null) return this.pageCache

            var result = [STR_CMD_LUI_ENTITYUPDATE]
            result.push(this.config.title ?? '')
            const titleNav = this.generateTitleNav()
            result.push(titleNav)

            const qrText: string = this.config.qrCode ?? ''
            result.push(qrText)

            const entitites = this.generateEntities()
            result.push(entitites)

            this.pageCache = result.join(STR_LUI_DELIMITER)
            return this.pageCache
        }
    }

    RED.nodes.registerType('nspanel-page-qr', QrPageNode)
}
