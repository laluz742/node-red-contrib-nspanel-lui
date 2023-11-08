/* eslint-disable import/no-import-module-exports */
import { EntitiesPageNode } from '../lib/entities-page-node'
import { NSPanelUtils } from '../lib/nspanel-utils'
import { NSPanelColorUtils } from '../lib/nspanel-colorutils'
import { EntityBasedPageConfig, NodeRedSendCallback, PageInputMessage, PanelColor } from '../types/types'
import * as NSPanelConstants from '../lib/nspanel-constants'

type PageUnlockConfig = EntityBasedPageConfig & {
    iconStatus: string
    iconStatusColor: PanelColor
    pinCode: string
    unlockLabel: string
}

const MAX_ENTITIES = 0
const DEFAULT_LABEL = 'OK'
const UNLOCK_ACTION = 'unlock'

module.exports = (RED) => {
    class UnlockPageNode extends EntitiesPageNode<PageUnlockConfig> {
        private config: PageUnlockConfig

        constructor(config: PageUnlockConfig) {
            super(config, RED, { pageType: NSPanelConstants.STR_PAGE_TYPE_CARD_ALARM, maxEntities: MAX_ENTITIES })

            this.config = { ...config }
        }

        protected override handleInput(_msg: PageInputMessage, _send: NodeRedSendCallback): boolean {
            const handled = false

            // TODO: transcribe unlock event to navigation event if passcode matches

            return handled
        }

        protected override doGeneratePage(): string | string[] | null {
            const result: (string | number)[] = [NSPanelConstants.STR_LUI_CMD_ENTITYUPDATE]

            const titleNav = this.generateTitleNav()
            const entitites = this.generateEntities()

            const statusIcon = this.config?.iconStatus ?? NSPanelConstants.STR_EMPTY
            const statusIconColor = this.config?.iconStatusColor
            const numpadStatus = NSPanelConstants.STR_ENABLE
            const flashingStatus = NSPanelConstants.STR_DISABLE

            result.push(this.config.title ?? NSPanelConstants.STR_EMPTY)
            result.push(titleNav)
            result.push(this.config?.name ?? NSPanelConstants.STR_EMPTY)

            result.push(entitites)
            result.push(NSPanelUtils.getIcon(statusIcon))
            result.push(NSPanelColorUtils.toHmiColor(statusIconColor))
            result.push(numpadStatus)
            result.push(flashingStatus)

            // extra button
            result.push(NSPanelConstants.STR_EMPTY)
            result.push(NSPanelConstants.STR_EMPTY)
            result.push(NSPanelConstants.STR_EMPTY)

            return result.join(NSPanelConstants.STR_LUI_DELIMITER)
        }

        protected override generateEntities(): string {
            const resultEntities: string[] = []

            resultEntities.push(`${NSPanelConstants.STR_LUI_DELIMITER}`)
            resultEntities.push(`${NSPanelConstants.STR_LUI_DELIMITER}`)
            resultEntities.push(`${NSPanelConstants.STR_LUI_DELIMITER}`)
            resultEntities.push(
                `${this.config?.unlockLabel ?? DEFAULT_LABEL}${NSPanelConstants.STR_LUI_DELIMITER}${UNLOCK_ACTION}`
            )

            return resultEntities.join(NSPanelConstants.STR_LUI_DELIMITER)
        }
    }

    RED.nodes.registerType('nspanel-page-unlock', UnlockPageNode)
}
