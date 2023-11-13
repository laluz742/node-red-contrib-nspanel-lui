/* eslint-disable import/no-import-module-exports */
import { ScreenSaverNodeBase } from '../lib/screensaver-node-base'
import { NSPanelUtils } from '../lib/nspanel-utils'
import { NSPanelColorUtils } from '../lib/nspanel-colorutils'
import { NSPanelMessageUtils } from '../lib/nspanel-message-utils'
import {
    InputHandlingResult,
    NodeRedSendCallback,
    PageData,
    PageEntityData,
    PageInputMessage,
    ScreenSaverBaseConfig,
    StatusItemData,
} from '../types/types'
import * as NSPanelConstants from '../lib/nspanel-constants'

type ScreenSaverConfig = ScreenSaverBaseConfig & {}

const MAX_ENTITIES = 6
const MAX_STATUS2_ITEMS = 8
const CMD_WEATHERUPDATE: string = 'weatherUpdate'
const BLANK_ENTITY = NSPanelUtils.makeEntity(NSPanelConstants.STR_LUI_ENTITY_NONE)

module.exports = (RED) => {
    class ScreenSaver2PageNode extends ScreenSaverNodeBase<ScreenSaverConfig> {
        protected status2Data: StatusItemData[] = [] // [0]: main icon/text [1..5] right icons [6..8] left icons

        constructor(config: ScreenSaverConfig) {
            super(config, RED, {
                pageType: NSPanelConstants.STR_PAGE_TYPE_CARD_SCREENSAVER2,
                maxEntities: MAX_ENTITIES,
            })
        }

        public override generatePage(): string | string[] | null {
            const result: string[] = []

            const statusUpdate = this.generateStatusUpdate()
            if (statusUpdate) result.push(statusUpdate)

            const weatherUpdate = this.generateWeatherUpdate()
            if (weatherUpdate) result.push(weatherUpdate)

            return result
        }

        protected override handleInput(msg: PageInputMessage, send: NodeRedSendCallback): InputHandlingResult {
            if (!NSPanelMessageUtils.hasProperty(msg, 'topic')) return { handled: false }

            let inputHandled: InputHandlingResult = { handled: false }
            switch (msg.topic) {
                case NSPanelConstants.STR_MSG_TOPIC_STATUS2: {
                    inputHandled = this.handleStatus2Input(msg)
                    break
                }

                default:
                    inputHandled = super.handleInput(msg, send)
                    break
            }

            return inputHandled
        }

        private handleStatus2Input(msg: PageInputMessage): InputHandlingResult {
            if (msg.payload === undefined) return { handled: false }

            const inputHandled: InputHandlingResult = { handled: false }
            let dirty: boolean = false

            // TODO: take msg.parts into account to allow to set specific status
            const status2InputData = msg.payload
            const status2Items: StatusItemData[] = this.status2Data.map((item) => item)

            if (Array.isArray(status2InputData)) {
                for (let i = 0; i < MAX_STATUS2_ITEMS; i += 1) {
                    const inputData = status2InputData[i]
                    if (inputData != null) {
                        const item: StatusItemData = NSPanelMessageUtils.convertToStatusItemData(
                            inputData
                        ) as StatusItemData
                        const idx = NSPanelMessageUtils.getPropertyOrDefault(item, 'index', i)
                        item.index = idx

                        status2Items[idx] = item
                        dirty = true
                    }
                }
            } else if (status2InputData != null) {
                const item = NSPanelMessageUtils.convertToStatusItemData(status2InputData) as StatusItemData
                const idx = NSPanelMessageUtils.getPropertyOrDefault(item, 'index', 0)
                item.index = idx
                status2Items[idx] = item
                dirty = true
            }

            if (dirty) {
                this.status2Data = status2Items
                inputHandled.handled = true
                inputHandled.requestUpdate = true
            }

            return inputHandled
        }

        private generateWeatherUpdate(): string {
            const pageData: PageData = this.getPageData()
            if (pageData.entities.length === 0) {
                return null
            }

            const result: (string | number)[] = []
            result.push(CMD_WEATHERUPDATE)

            const mainStatusEntity = this.makeStatusItem(this.status2Data[0])
            result.push(mainStatusEntity)

            // eslint-disable-next-line prefer-const
            for (let idx = 6; idx < 9; idx += 1) {
                const item = this.status2Data[idx]
                const entity = this.makeStatusItem(item)
                result.push(entity)
            }

            // 6 bottom entities
            const entityData: PageEntityData[] = pageData.entities
            // eslint-disable-next-line prefer-const
            for (let i = 0; i < MAX_ENTITIES; i += 1) {
                const item = entityData[i]
                const entity =
                    item != null
                        ? NSPanelUtils.makeEntity(
                              '',
                              '',
                              NSPanelUtils.getIcon(item.icon),
                              NSPanelColorUtils.toHmiColor(item.iconColor ?? NaN),
                              item.text,
                              item.value
                          )
                        : BLANK_ENTITY
                result.push(entity)
            }

            // 5 right icons
            // eslint-disable-next-line prefer-const
            for (let idx = 1; idx < 6; idx += 1) {
                const item = this.status2Data[idx]
                const entity = this.makeStatusItem(item)
                result.push(entity)
            }

            const resultStr: string = result.join(NSPanelConstants.STR_LUI_DELIMITER)
            return resultStr
        }

        private makeStatusItem(item: StatusItemData): string {
            const entity =
                item != null
                    ? NSPanelUtils.makeEntity(
                          'text',
                          `${item.index}`,
                          (item.prefix ?? '') + NSPanelUtils.getIcon(item.icon),
                          NSPanelColorUtils.toHmiColor(NaN),
                          null,
                          item.text ?? ''
                      )
                    : BLANK_ENTITY

            return entity
        }
    }

    RED.nodes.registerType('nspanel-screensaver2', ScreenSaver2PageNode)
}
