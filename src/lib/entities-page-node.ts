import {
    IPageOptions,
    IEntityBasedPageConfig,
    PageCacheData,
    PanelEntity,
    NodeAPI,
    PageInputMessage,
    NodeRedSendCallback,
    PageEntityData,
} from '../types'
import { DEFAULT_HMI_COLOR, STR_LUI_CMD_ENTITYUPDATE, STR_LUI_DELIMITER } from './nspanel-constants'
import { NSPanelPopupHelpers } from './nspanel-popup-helpers'
import { NSPanelUtils } from './nspanel-utils'
import { PageNode } from './page-node'

export class EntitiesPageNode<TConfig extends IEntityBasedPageConfig> extends PageNode<TConfig> {
    protected entitiesPageNodeConfig: IEntityBasedPageConfig
    private entitiesPageNodePageCache: PageCacheData = null
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

    protected override handleInput(msg: PageInputMessage, _send: NodeRedSendCallback) {
        switch (msg.topic) {
            case 'data':
                //copy cached data
                var entityData: Map<string, PageEntityData> = new Map<string, PageEntityData>(this.entityData)
                const entityInputData = Array.isArray(msg.payload) ? msg.payload : [msg.payload]
                var dirty = false

                // TODO: dirty management
                entityInputData.forEach((item) => {
                    if (item && 'entityId' in item) {
                        const entityId = item.entityId ?? null
                        if (entityId !== null && this.entities.has(entityId)) {
                            entityData.set(entityId, item)
                            dirty = true
                        }
                    }
                })

                if (dirty) {
                    this.entityData = entityData
                    this.clearPageCache()
                }
                return true
        }

        return false
    }

    public generatePage(): string | string[] | null {
        if (this.hasPageCache()) return this.getPageCache()

        var result: string[] = [STR_LUI_CMD_ENTITYUPDATE]
        result.push(this.entitiesPageNodeConfig.title ?? '')
        const titleNav = this.generateTitleNav()
        result.push(titleNav)

        const entitites = this.generateEntities()
        result.push(entitites)

        const pageData: string = result.join(STR_LUI_DELIMITER)
        this.setPageCache(pageData)

        return pageData
    }

    public generatePopupDetails(_type: string, entityId: string): string | string[] | null {
        const entities = this.entitiesPageNodeConfig.entities ?? []

        var entity: PanelEntity = entities.filter((entity) => entity.entityId == entityId)[0] ?? null

        if (entity != null) {
            const entityData = this.entityData.get(entity.entityId)

            if (entityData != null) {
                const result = NSPanelPopupHelpers.generatePopup(this, entity, entityData)
                return result
            }
        }

        return null
    }

    protected getEntities(): PanelEntity[] {
        const entities = this.entitiesPageNodeConfig.entities
        return entities
    }

    protected getEntityData(entityId: string): PageEntityData | null {
        const entityData = this.entityData.get(entityId)
        return entityData ?? null
    }

    protected generateEntities(): string {
        var resultEntities: string[] = []

        const entities = this.getEntities()
        const maxEntities = this.options?.maxEntities
            ? Math.min(this.options.maxEntities, entities.length)
            : entities.length

        for (var i = 0; i < maxEntities; i++) {
            var entityConfig = entities[i]
            const entityData = this.getEntityData(entityConfig.entityId)
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

        return resultEntities.join(STR_LUI_DELIMITER)
    }

    // #region cache
    protected hasPageCache(): boolean {
        return this.entitiesPageNodePageCache !== null
    }

    protected getPageCache(): PageCacheData {
        return this.entitiesPageNodePageCache
    }

    protected setPageCache(data: PageCacheData): void {
        this.entitiesPageNodePageCache = data
    }

    protected clearPageCache(): void {
        this.entitiesPageNodePageCache = null
    }
    // #endregion cache
}
