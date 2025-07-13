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
    InputHandlingResult,
    HMICommand,
    HMICommandParameters,
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

    protected override handleInput(msg: PageInputMessage, _send: NodeRedSendCallback): InputHandlingResult {
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
                return { handled: true, requestUpdate: true }
            }
        }

        return { handled: false }
    }

    protected doGeneratePage(): HMICommand | null {
        const titleNav = this.generateTitleNav()
        const entitites = this.generateEntities()

        const hmiCmdParams: HMICommandParameters = []
        hmiCmdParams.push(this.entitiesPageNodeConfig.title ?? '')
        hmiCmdParams.push(titleNav)
        hmiCmdParams.push(entitites)

        const hmiCmd: HMICommand = {
            cmd: NSPanelConstants.STR_LUI_CMD_ENTITYUPDATE,
            params: hmiCmdParams,
        }
        return hmiCmd
    }

    public generatePopupDetails(type: string, entityId: string): HMICommand | null {
        const entities = [...this.entities.values()] ?? []

        // generate popup only, if related to a known entity or the page itself
        const entity: PanelEntity = entities.filter((e) => e.entityId === entityId)[0] ?? null
        if (entity != null) {
            const entityData = this.entityData.get(entity.entityId)

            // if (entityData != null) { // entity data might be undefined, if nothing received yet
            const hmiCmd: HMICommand = NSPanelPopupHelpers.generatePopup(type, this, entity, entityData)
            return hmiCmd
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

    protected setEntityData(entityId: string, data: PageEntityData): void {
        this.entityData.set(entityId, data)
    }

    protected setMaxEntities(n: number): void {
        this.options.maxEntities = n
    }

    protected generateEntities(): string {
        const resultEntities: string[] = []

        const entities = this.getEntities()
        const maxEntities = this.options?.maxEntities
            ? Math.min(this.options.maxEntities, entities.length)
            : entities.length

        for (const entityConfig of entities.slice(0, maxEntities)) {
            const entityData = this.getEntityData(entityConfig.entityId)

            const icon = entityData?.icon ?? entityConfig.icon
            const iconColor = entityData?.iconColor ?? entityConfig.iconColor
            const text = entityData?.text ?? entityConfig.text
            const optionalValue = entityData?.value ?? entityConfig.optionalValue

            const entity = NSPanelUtils.makeEntity(
                entityConfig.type,
                entityConfig.entityId,
                NSPanelUtils.getIcon(icon ?? ''),
                NSPanelColorUtils.toHmiColor(iconColor),
                text ?? '',
                optionalValue
            )

            resultEntities.push(entity)
        }

        return resultEntities.join(NSPanelConstants.STR_LUI_DELIMITER)
    }
}
