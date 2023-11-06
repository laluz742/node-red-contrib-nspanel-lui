/* eslint-disable import/no-import-module-exports */
import { EntitiesPageNode } from '../lib/entities-page-node'
import { EntityBasedPageConfig, PanelEntity } from '../types/types'
import * as NSPanelConstants from '../lib/nspanel-constants'

interface PageQRConfig extends EntityBasedPageConfig {
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
                for (let i = 0; i < MAX_ENTITIES - config.entities.length; i += 1) {
                    const entityFill = { ...EMPTY_ENTITY }
                    entityFill.entityId += +i
                    config.entities.push(entityFill)
                }
            }

            super(config, RED, { pageType: NSPanelConstants.STR_PAGE_TYPE_CARD_QR, maxEntities: MAX_ENTITIES })

            this.config = { ...config }
        }

        protected override doGeneratePage(): string | string[] | null {
            const result: string[] = [NSPanelConstants.STR_LUI_CMD_ENTITYUPDATE]
            result.push(this.config.title ?? '')
            const titleNav = this.generateTitleNav()
            result.push(titleNav)

            const qrText: string = this.config.qrCode ?? ''
            result.push(qrText)

            const entitites = this.generateEntities()
            result.push(entitites)

            return result.join(NSPanelConstants.STR_LUI_DELIMITER)
        }
    }

    RED.nodes.registerType('nspanel-page-qr', QrPageNode)
}
