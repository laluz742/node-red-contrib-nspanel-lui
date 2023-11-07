import { NSPanelColorUtils } from './nspanel-colorutils'
import { NSPanelPopupHelpers } from './nspanel-popup-helpers'
import { NSPanelUtils } from './nspanel-utils'
import { PageNodeBase } from './page-node-base'
import {
    PageOptions,
    EntityBasedPageConfig,
    PanelEntity,
    NodeAPI,
    PageInputMessage,
    NodeRedSendCallback,
    PageEntityData,
} from '../types/types'
import * as NSPanelConstants from './nspanel-constants'

export class EntitiesPageNode<TConfig extends EntityBasedPageConfig> extends PageNodeBase<TConfig> {
    protected entitiesPageNodeConfig: EntityBasedPageConfig

    private entities: Map<string, PanelEntity> = new Map<string, PanelEntity>()

    private entityData: Map<string, PageEntityData> = new Map<string, PageEntityData>()

    constructor(config: TConfig, RED: NodeAPI, options: PageOptions) {
        super(config, RED, options)
        this.entitiesPageNodeConfig = config
        this.options = options

        this.entitiesPageNodeConfig.entities?.forEach((entity) => {
            this.entities.set(entity.entityId, entity)
        })
        this.entities.set(config.name, { entityId: config.name, type: '@self' })
    }

    protected override handleInput(msg: PageInputMessage, _send: NodeRedSendCallback) {
        switch (msg.topic) {
            case NSPanelConstants.STR_MSG_TOPIC_DATA: {
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
        const result: string[] = [NSPanelConstants.STR_LUI_CMD_ENTITYUPDATE]
        result.push(this.entitiesPageNodeConfig.title ?? '')
        const titleNav = this.generateTitleNav()
        result.push(titleNav)

        const entitites = this.generateEntities()
        result.push(entitites)

        const pageData: string = result.join(NSPanelConstants.STR_LUI_DELIMITER)
        return pageData
    }

    public generatePopupDetails(type: string, entityId: string): string | string[] | null {
        const entities = [...this.entities.values()] ?? []

        // generate popup only, if related to a known entity or the page itself
        const entity: PanelEntity = entities.filter((e) => e.entityId === entityId)[0] ?? null
        if (entity != null) {
            const entityData = this.entityData.get(entity.entityId)

            // if (entityData != null) { // entity data might be undefined, if nothing received yet
            const result = NSPanelPopupHelpers.generatePopup(type, this, entity, entityData)
            return result
            // }
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
                NSPanelColorUtils.toHmiColor(entityConfig.iconColor ?? NSPanelConstants.DEFAULT_LUI_COLOR),
                text ?? '',
                optionalValue
            )

            resultEntities.push(entity)
        }

        return resultEntities.join(NSPanelConstants.STR_LUI_DELIMITER)
    }
}
