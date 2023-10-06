import {
    IPageOptions,
    IEntityBasedPageConfig,
    PageCache,
    PanelEntity,
    NodeAPI,
    PageInputMessage,
    NodeRedSendCallback,
    PageEntityData,
} from '../types'
import { DEFAULT_HMI_COLOR } from './nspanel-constants'
import { NSPanelPopupHelpers } from './nspanel-popup-helpers'
import { NSPanelUtils } from './nspanel-utils'
import { PageNode } from './page-node'

export class EntitiesPageNode<TConfig extends IEntityBasedPageConfig> extends PageNode<TConfig> {
    protected entitiesPageNodeConfig: IEntityBasedPageConfig
    protected entitiesPageNodePageCache: PageCache = null
    private entities: Map<string, PanelEntity> = new Map<string, PanelEntity>()
    private entityData: Map<string, PageEntityData> = new Map<string, PageEntityData>()

    constructor(config: TConfig, RED: NodeAPI, options: IPageOptions) {
        super(config, RED, options)
        this.entitiesPageNodeConfig = config
        this.options = options

        this.entitiesPageNodeConfig.entities?.forEach((entity) => {
            this.entities.set(entity.entityId, entity)
        })
    }

    protected override handleInput(msg: PageInputMessage, send: NodeRedSendCallback): boolean {
        switch (msg.topic) {
            case 'data':
                //copy cached data
                var entityData: Map<string, PageEntityData> = new Map<string, PageEntityData>(this.entityData)
                const entityInputData = Array.isArray(msg.payload) ? msg.payload : [msg.payload]
                var dirty = false

                // TODO: dirty management
                entityInputData.forEach((item, idx) => {
                    if ('entityId' in item) {
                        const entityId = item.entityId ?? null
                        if (entityId !== null && this.entities.has(entityId)) {
                            entityData.set(entityId, item)
                            dirty = true
                        }
                    }
                })

                if (dirty) {
                    this.entityData = entityData
                    this.entitiesPageNodePageCache = null
                }
                return true
        }

        return false
    }

    public generatePage(): string | string[] {
        if (this.entitiesPageNodePageCache !== null) return this.entitiesPageNodePageCache

        var result = ['entityUpd']
        result.push(this.entitiesPageNodeConfig.title ?? '')
        const titleNav = this.generateTitleNav()
        result.push(titleNav)

        const entitites = this.generateEntities()
        result.push(entitites)

        this.entitiesPageNodePageCache = result.join('~')
        return this.entitiesPageNodePageCache
    }

    public generatePopupDetails(type: string, entityId: string): string | string[] | null {
        const entities = this.entitiesPageNodeConfig.entities ?? []

        var entity: PanelEntity = entities.filter((entity) => entity.entityId == entityId)[0] ?? null

        if (entity !== null) {
            const entityData: PageEntityData = this.entityData.get(entity.entityId)

            if (entity !== null) {
                //FIXME: meaning entityData???
                const result = NSPanelPopupHelpers.generatePopup(entity, entityData)
                return result
            }
        }

        return null
    }

    protected generateEntities(): string {
        var resultEntities = []
        const entities = this.entitiesPageNodeConfig.entities
        for (var i = 0; i < this.options.maxEntities && i < entities.length; i++) {
            var entityConfig = entities[i]
            const entityData: PageEntityData = this.entityData.get(entityConfig.entityId)
            const optionalValue = entityData?.value ?? entityConfig.optionalValue

            const icon = entityData?.icon ?? entityConfig.icon
            const text = entityData?.text ?? entityConfig.text

            var entity = NSPanelUtils.makeEntity(
                entityConfig.type,
                entityConfig.entityId,
                NSPanelUtils.getIcon(icon ?? ''),
                NSPanelUtils.toHmiIconColor(entityConfig.iconColor ?? DEFAULT_HMI_COLOR),
                text ?? '',
                optionalValue
            )

            resultEntities.push(entity)
        }

        return resultEntities.join('~')
    }
}
