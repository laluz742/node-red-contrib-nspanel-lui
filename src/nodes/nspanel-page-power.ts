/* eslint-disable import/no-import-module-exports */
import { EntitiesPageNode } from '../lib/entities-page-node'
import { NSPanelUtils } from '../lib/nspanel-utils'
import { NSPanelColorUtils } from '../lib/nspanel-colorutils'
import { STR_LUI_DELIMITER, STR_PAGE_TYPE_CARD_POWER } from '../lib/nspanel-constants'
import { EntityBasedPageConfig, PowerEntityData } from '../types/types'

type PagePowerConfig = EntityBasedPageConfig & {}

const MAX_ENTITIES = 8
const DEFAULT_SPEED = 0
const MIN_SPEED = -120
const MAX_SPEED = 120

module.exports = (RED) => {
    class PagePowerNode extends EntitiesPageNode<PagePowerConfig> {
        constructor(config: PagePowerConfig) {
            super(config, RED, { pageType: STR_PAGE_TYPE_CARD_POWER, maxEntities: MAX_ENTITIES })
        }

        protected override generateEntities(): string {
            const resultEntities: string[] = []
            const entities = this.getEntities()

            const maxEntities = this.options?.maxEntities
                ? Math.min(this.options.maxEntities, entities.length)
                : entities.length

            for (let i = 0; i < maxEntities; i += 1) {
                const entityConfig = entities[i]
                const entityData: PowerEntityData = this.getEntityData(entityConfig.entityId) as PowerEntityData

                const optionalValue = entityData?.value ?? entityConfig.optionalValue
                const icon = entityData?.icon ?? entityConfig.icon
                const iconColor = entityData?.iconColor ?? entityConfig.iconColor
                const text = entityData?.text ?? entityConfig.text
                let speed = Number(entityData?.speed ?? DEFAULT_SPEED)
                speed = NSPanelUtils.limitNumberToRange(speed, MIN_SPEED, MAX_SPEED, DEFAULT_SPEED)

                let entity = NSPanelUtils.makeEntity(
                    entityConfig.type,
                    entityConfig.entityId,
                    NSPanelUtils.getIcon(icon),
                    NSPanelColorUtils.toHmiColor(iconColor),
                    text,
                    optionalValue
                )
                entity += `${STR_LUI_DELIMITER}${speed}`

                resultEntities.push(entity)
            }

            return resultEntities.join(STR_LUI_DELIMITER)
        }
    }

    RED.nodes.registerType('nspanel-page-power', PagePowerNode)
}
