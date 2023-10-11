import { IEntityBasedPageConfig, PageCacheData } from '../types'
import { EntitiesPageNode } from '../lib/entities-page-node'

interface PageQRConfig extends IEntityBasedPageConfig {
    qrCode: string | undefined
}

const PAGE_TYPE = 'cardQR'
const MAX_ENTITIES = 2

module.exports = (RED) => {
    class QrPageNode extends EntitiesPageNode<PageQRConfig> {
        private config: PageQRConfig
        private pageCache: PageCacheData = null

        constructor(config: PageQRConfig) {
            super(config, RED, { pageType: PAGE_TYPE, maxEntities: MAX_ENTITIES })

            this.config = Object.assign({}, config)
        }

        generatePage(): string | string[] {
            if (this.pageCache !== null) return this.pageCache

            var result = ['entityUpd']
            result.push(this.config.title ?? '')
            const titleNav = this.generateTitleNav()
            result.push(titleNav)

            const qrText: string = this.config.qrCode ?? ''
            result.push(qrText)

            const entitites = this.generateEntities()
            result.push(entitites)

            this.pageCache = result.join('~')
            return this.pageCache
        }
    }

    RED.nodes.registerType('nspanel-page-qr', QrPageNode)
}
