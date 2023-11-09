/* eslint-disable import/no-import-module-exports */
import { NSPanelUtils } from '../lib/nspanel-utils'
import { NSPanelColorUtils } from '../lib/nspanel-colorutils'
import { EntityBasedPageConfig, EventArgs, NodeRedSendCallback, PanelColor } from '../types/types'
import * as NSPanelConstants from '../lib/nspanel-constants'
import { PageNodeBase } from '../lib/page-node-base'

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
    class UnlockPageNode extends PageNodeBase<PageUnlockConfig> {
        private config: PageUnlockConfig

        constructor(config: PageUnlockConfig) {
            super(config, RED, { pageType: NSPanelConstants.STR_PAGE_TYPE_CARD_ALARM, maxEntities: MAX_ENTITIES })

            this.config = { ...config }
        }

        protected preHandleUiEvent(eventArgs: EventArgs, send: NodeRedSendCallback): boolean {
            if (eventArgs.event2 === UNLOCK_ACTION) {
                const inputPinCode = `${eventArgs.value}`
                const pinCode = this.config?.pinCode
                if (inputPinCode === pinCode) {
                    const cfgEvent = this.getConfiguredEvents().get(UNLOCK_ACTION)
                    this.handleConfiguredEvent(eventArgs, cfgEvent, send)
                }

                // suppress further processing of UNLOCK_ACTION
                return true
            }

            return false
        }

        protected override doGeneratePage(): string | string[] | null {
            const result: (string | number)[] = [NSPanelConstants.STR_LUI_CMD_ENTITYUPDATE]

            const titleNav = this.generateTitleNav()
            const entitites = this.generateActionButtons()

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

        private generateActionButtons(): string {
            const resultEntities: string[] = []
            resultEntities.push(
                `${this.config?.unlockLabel ?? DEFAULT_LABEL}${NSPanelConstants.STR_LUI_DELIMITER}${UNLOCK_ACTION}`
            )
            resultEntities.push(`${NSPanelConstants.STR_LUI_DELIMITER}`)
            resultEntities.push(`${NSPanelConstants.STR_LUI_DELIMITER}`)
            resultEntities.push(`${NSPanelConstants.STR_LUI_DELIMITER}`)

            return resultEntities.join(NSPanelConstants.STR_LUI_DELIMITER)
        }
    }

    RED.nodes.registerType('nspanel-page-unlock', UnlockPageNode)
}
