/* eslint-disable import/no-import-module-exports */
import { EntitiesPageNode } from '../lib/entities-page-node'
import { NSPanelUtils } from '../lib/nspanel-utils'
import { NSPanelColorUtils } from '../lib/nspanel-colorutils'
import {
    AlarmData,
    EntityBasedPageConfig,
    HMICommand,
    HMICommandParameters,
    InputHandlingResult,
    NodeRedSendCallback,
    PageInputMessage,
    PanelColor,
} from '../types/types'
import * as NSPanelConstants from '../lib/nspanel-constants'

type PageAlarmConfig = EntityBasedPageConfig & {
    numPadDisabled: boolean
    iconStatus: string
    iconStatusColor: PanelColor
    extraButtonIcon: string
    extraButtonIconColor: PanelColor
    extraButtonId: string
}

const MAX_ENTITIES = 4
const EMPTY_ENTITY: PanelEntityListItem = {
    listIndex: null,
    listId: null,
    type: 'delete',
    entityId: 'none.',
}

module.exports = (RED) => {
    class AlarmPageNode extends EntitiesPageNode<PageAlarmConfig> {
        private config: PageAlarmConfig

        private data: AlarmData = {}

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

        protected override handleInput(msg: PageInputMessage, send: NodeRedSendCallback): InputHandlingResult {
            let handled: InputHandlingResult = { handled: false, requestUpdate: false }
            let dirty = false

            switch (msg.topic) {
                case NSPanelConstants.STR_MSG_TOPIC_DATA: {
                    if (msg.payload != null && typeof msg.payload === 'object') {
                        const msgData: AlarmData = msg.payload as AlarmData

                        const statusIcon: string = msgData?.statusIcon ?? null
                        const statusIconColor: PanelColor = msgData?.statusIconColor ?? null
                        const statusIconFlashing: boolean =
                            msgData?.statusIconFlashing != null ? msgData?.statusIconFlashing === true : null
                        const numPadDisabled: boolean =
                            msgData?.numPadDisabled != null ? msgData?.numPadDisabled === true : null

                        this.data.statusIcon = statusIcon
                        this.data.statusIconColor = statusIconColor
                        this.data.statusIconFlashing = statusIconFlashing
                        this.data.numPadDisabled = numPadDisabled

                        dirty =
                            statusIcon != null ||
                            statusIconColor != null ||
                            statusIconFlashing != null ||
                            numPadDisabled != null
                    }
                    break
                }
            }

            if (dirty) {
                handled.handled = true
                this.getCache().clear()
            } else {
                handled = super.handleInput(msg, send)
            }

            return handled
        }

        protected override doGeneratePage(): HMICommand | null {
            const hmiCmdParams: HMICommandParameters = []

            const titleNav = this.generateTitleNav()
            const entitites = this.generateEntities()

            const statusIcon = this.data?.statusIcon ?? this.config?.iconStatus ?? NSPanelConstants.STR_EMPTY
            const statusIconColor = this.data?.statusIconColor ?? this.config?.iconStatusColor
            const numpadStatus =
                this.data?.numPadDisabled ?? this.config?.numPadDisabled ?? false
                    ? NSPanelConstants.STR_DISABLE
                    : NSPanelConstants.STR_ENABLE
            const flashingStatus =
                this.data?.statusIconFlashing ?? false ? NSPanelConstants.STR_ENABLE : NSPanelConstants.STR_DISABLE

            hmiCmdParams.push(this.config.title ?? NSPanelConstants.STR_EMPTY)
            hmiCmdParams.push(titleNav)
            hmiCmdParams.push(this.config?.name ?? NSPanelConstants.STR_EMPTY)

            hmiCmdParams.push(entitites)
            hmiCmdParams.push(NSPanelUtils.getIcon(statusIcon))
            hmiCmdParams.push(NSPanelColorUtils.toHmiColor(statusIconColor))
            hmiCmdParams.push(numpadStatus)
            hmiCmdParams.push(flashingStatus)

            hmiCmdParams.push(NSPanelUtils.getIcon(this.config?.extraButtonIcon))
            hmiCmdParams.push(NSPanelColorUtils.toHmiColor(this.config?.extraButtonIconColor))
            hmiCmdParams.push(this.config?.extraButtonId ?? NSPanelConstants.STR_EMPTY)

            const hmiCmd: HMICommand = {
                cmd: NSPanelConstants.STR_LUI_CMD_ENTITYUPDATE,
                params: hmiCmdParams,
            }
            return hmiCmd
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
