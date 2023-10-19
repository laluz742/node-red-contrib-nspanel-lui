import { NSPanelColorUtils } from './nspanel-colorutils'
import { DEFAULT_LUI_COLOR, STR_LUI_CMD_ENTITYUPDATE, STR_LUI_DELIMITER } from './nspanel-constants'
import { NSPanelPopupHelpers } from './nspanel-popup-helpers'
import { NSPanelUtils } from './nspanel-utils'
import { PageNode } from './page-node'
import {
    IPageOptions,
    IEntityBasedPageConfig,
    PanelEntity,
    NodeAPI,
    PageInputMessage,
    NodeRedSendCallback,
    PageEntityData,
} from '../types/types'

export class EntitiesPageNode<TConfig extends IEntityBasedPageConfig> extends PageNode<TConfig> {
    protected entitiesPageNodeConfig: IEntityBasedPageConfig

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
            case 'data': {
                // copy cached data
                const entityData: Map<string, PageEntityData> = new Map<string, PageEntityData>(this.entityData)
                const entityInputData = Array.isArray(msg.payload) ? msg.payload : [msg.payload]
                let dirty = false

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
                    this.getCache().clear()
                }
                return true
            }
        }

        return false
    }

    protected doGeneratePage(): string | string[] | null {
        const result: string[] = [STR_LUI_CMD_ENTITYUPDATE]
        result.push(this.entitiesPageNodeConfig.title ?? '')
        const titleNav = this.generateTitleNav()
        result.push(titleNav)

        const entitites = this.generateEntities()
        result.push(entitites)

        const pageData: string = result.join(STR_LUI_DELIMITER)
        return pageData
    }

    public generatePopupDetails(_type: string, entityId: string): string | string[] | null {
        const entities = this.entitiesPageNodeConfig.entities ?? []

        const entity: PanelEntity = entities.filter((e) => e.entityId === entityId)[0] ?? null

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
        const resultEntities: string[] = []

        const entities = this.getEntities()
        const maxEntities = this.options?.maxEntities
            ? Math.min(this.options.maxEntities, entities.length)
            : entities.length

        for (let i = 0; i < maxEntities; i += 1) {
            const entityConfig = entities[i]
            const entityData = this.getEntityData(entityConfig.entityId)
            const optionalValue = entityData?.value ?? entityConfig.optionalValue

            const icon = entityData?.icon ?? entityConfig.icon
            const text = entityData?.text ?? entityConfig.text

            const entity = NSPanelUtils.makeEntity(
                entityConfig.type,
                entityConfig.entityId,
                NSPanelUtils.getIcon(icon ?? ''),
                NSPanelColorUtils.toHmiIconColor(entityConfig.iconColor ?? DEFAULT_LUI_COLOR),
                text ?? '',
                optionalValue
            )

            resultEntities.push(entity)
        }

        return resultEntities.join(STR_LUI_DELIMITER)
    }
}
