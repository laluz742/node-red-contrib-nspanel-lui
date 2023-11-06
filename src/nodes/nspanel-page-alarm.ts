/* eslint-disable import/no-import-module-exports */
import { EntitiesPageNode } from '../lib/entities-page-node'
import { NSPanelUtils } from '../lib/nspanel-utils'
import { NSPanelColorUtils } from '../lib/nspanel-colorutils'
import { EntityBasedPageConfig, PanelColor } from '../types/types'
import * as NSPanelConstants from '../lib/nspanel-constants'

type PageAlarmConfig = EntityBasedPageConfig & {
    numPadDisabled: boolean
    flashingStatusDisabled: boolean
    iconStatus: string
    iconStatusColor: PanelColor
    extraButtonIcon: string
    extraButtonIconColor: PanelColor
    extraButtonId: string
}

const MAX_ENTITIES = 4
const EMPTY_ENTITY: PanelEntity = {
    type: 'delete',
    entityId: 'none.',
}

module.exports = (RED) => {
    class AlarmPageNode extends EntitiesPageNode<PageAlarmConfig> {
        private config: PageAlarmConfig

        constructor(config: PageAlarmConfig) {
            super(config, RED, { pageType: NSPanelConstants.STR_PAGE_TYPE_CARD_ALARM, maxEntities: MAX_ENTITIES })

            if ((config.entities?.length ?? 0) < MAX_ENTITIES) {
                const fillCount = MAX_ENTITIES - (config.entities?.length ?? 0)
                for (let i = 0; i < fillCount; i += 1) {
                    const entityFill = { ...EMPTY_ENTITY }
                    entityFill.entityId += +i
                    config.entities.push(entityFill)
                }
            }

            this.config = { ...config }
        }

        protected override doGeneratePage(): string | string[] | null {
            const result: (string | number)[] = [NSPanelConstants.STR_LUI_CMD_ENTITYUPDATE]

            const titleNav = this.generateTitleNav()
            const entitites = this.generateEntities()
            const numpadStatus = this.config?.numPadDisabled
                ? NSPanelConstants.STR_DISABLE
                : NSPanelConstants.STR_ENABLE
            const flashingStatus = this.config?.flashingStatusDisabled
                ? NSPanelConstants.STR_DISABLE
                : NSPanelConstants.STR_ENABLE

            result.push(this.config.title ?? NSPanelConstants.STR_EMPTY)
            result.push(titleNav)
            result.push(this.config?.name ?? NSPanelConstants.STR_EMPTY)

            result.push(entitites)
            result.push(NSPanelUtils.getIcon(this.config?.iconStatus))
            result.push(NSPanelColorUtils.toHmiColor(this.config?.iconStatusColor))
            result.push(numpadStatus)
            result.push(flashingStatus)

            result.push(NSPanelUtils.getIcon(this.config?.extraButtonIcon))
            result.push(NSPanelColorUtils.toHmiColor(this.config?.extraButtonIconColor))
            result.push(this.config?.extraButtonId ?? NSPanelConstants.STR_EMPTY)

            return result.join(NSPanelConstants.STR_LUI_DELIMITER)
        }

        protected override generateEntities(): string {
            const resultEntities: string[] = []

            const entities = this.getEntities()
            const maxEntities = this.options?.maxEntities
                ? Math.min(this.options.maxEntities, entities.length)
                : entities.length

            for (let i = 0; i < maxEntities; i += 1) {
                const entityConfig = entities[i]
                const entityData = this.getEntityData(entityConfig.entityId)
                const text = entityData?.text ?? entityConfig.text

                if (entityConfig.type === NSPanelConstants.STR_LUI_ENTITY_NONE) {
                    resultEntities.push(`${NSPanelConstants.STR_LUI_DELIMITER}${entityConfig.entityId}`)
                } else {
                    resultEntities.push(
                        `${text}${NSPanelConstants.STR_LUI_DELIMITER}${
                            entityConfig.entityId ?? NSPanelConstants.STR_EMPTY
                        }`
                    )
                }
            }

            return resultEntities.join(NSPanelConstants.STR_LUI_DELIMITER)
        }
    }

    RED.nodes.registerType('nspanel-page-alarm', AlarmPageNode)
}
