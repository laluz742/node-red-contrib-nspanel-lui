import { EntitiesPageNode } from '../lib/entities-page-node'
import { STR_LUI_CMD_ENTITYUPDATE, STR_LUI_DELIMITER, STR_PAGE_TYPE_CARD_QR } from '../lib/nspanel-constants'
import { IEntityBasedPageConfig, PanelEntity } from '../types/types'

interface PageQRConfig extends IEntityBasedPageConfig {
    qrCode: string | undefined
}

const MAX_ENTITIES = 2
const EMPTY_ENTITY: PanelEntity = {
    type: 'text',
    entityId: 'text.',
}

module.exports = (RED) => {
    class QrPageNode extends EntitiesPageNode<PageQRConfig> {
        private config: PageQRConfig

        constructor(config: PageQRConfig) {
            config.entities = config.entities || []

            if (config.entities.length < MAX_ENTITIES) {
                for (let i = 0; i < MAX_ENTITIES - config.entities.length; i++) {
                    const entityFill = Object.assign({}, EMPTY_ENTITY)
                    entityFill.entityId += +i
                    config.entities.push(entityFill)
                }
            }

            super(config, RED, { pageType: STR_PAGE_TYPE_CARD_QR, maxEntities: MAX_ENTITIES })

            this.config = Object.assign({}, config)
        }

        protected override doGeneratePage(): string | string[] | null {
            const result: string[] = [STR_LUI_CMD_ENTITYUPDATE]
            result.push(this.config.title ?? '')
            const titleNav = this.generateTitleNav()
            result.push(titleNav)

            const qrText: string = this.config.qrCode ?? ''
            result.push(qrText)

            const entitites = this.generateEntities()
            result.push(entitites)

            return result.join(STR_LUI_DELIMITER)
        }
    }

    RED.nodes.registerType('nspanel-page-qr', QrPageNode)
}
