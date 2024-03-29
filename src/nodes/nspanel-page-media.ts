/* eslint-disable import/no-import-module-exports */
import { EntitiesPageNode } from '../lib/entities-page-node'
import { NSPanelColorUtils } from '../lib/nspanel-colorutils'
import { NSPanelUtils } from '../lib/nspanel-utils'
import {
    EntityBasedPageConfig,
    HMICommand,
    HMICommandParameters,
    InputHandlingResult,
    NodeRedSendCallback,
    PageInputMessage,
    PanelColor,
} from '../types/types'
import * as NSPanelConstants from '../lib/nspanel-constants'

type PageMediaConfig = EntityBasedPageConfig & {
    iconPlayPause: string
    hasOnOffButton: boolean
    hasIconShuffle: boolean
    onOffButtonColor: string
    shuffleIcon: string
}

type PageMediaData = {
    title: string
    titleColor: PanelColor
    artist: string
    artistColor: PanelColor
    volume: number
    iconPlayPause: string
}

const MAX_ENTITIES: number = 7
const VOLUME_MIN: number = 0
const VOLUME_MAX: number = 100
const DEFAULT_VOLUME: number = 50
const DEFAULT_ICON_PLAY_PAUSE: string = 'play'

module.exports = (RED) => {
    class PageMediaNode extends EntitiesPageNode<PageMediaConfig> {
        private config: PageMediaConfig

        private data: PageMediaData = {
            title: null,
            titleColor: null,
            artist: null,
            artistColor: null,
            volume: NaN,
            iconPlayPause: null,
        }

        constructor(config: PageMediaConfig) {
            super(config, RED, { pageType: NSPanelConstants.STR_PAGE_TYPE_CARD_MEDIA, maxEntities: MAX_ENTITIES })

            this.config = config
        }

        protected override handleInput(msg: PageInputMessage, send: NodeRedSendCallback): InputHandlingResult {
            let inputHandled: InputHandlingResult = { handled: false }
            let dirty = false

            switch (msg.topic) {
                case NSPanelConstants.STR_MSG_TOPIC_MEDIA: {
                    if (!Array.isArray(msg.payload)) {
                        // eslint-disable-next-line prefer-const
                        for (let key in msg.payload) {
                            if (Object.prototype.hasOwnProperty.call(this.data, key)) {
                                this.data[key] = msg.payload[key]
                                inputHandled.handled = true
                                dirty = true
                            }
                        }
                    }
                    break
                }
            }

            if (dirty) {
                this.getCache().clear()
                inputHandled.requestUpdate = true
            } else {
                inputHandled = super.handleInput(msg, send)
            }

            return inputHandled
        }

        protected doGeneratePage(): HMICommand | null {
            const hmiCmdParams: HMICommandParameters = []

            const titleNav = this.generateTitleNav()

            const dTitle: string = this.data.title ?? NSPanelConstants.STR_EMPTY
            const dTitleColor: string = `${NSPanelColorUtils.toHmiColor(this.data.titleColor ?? NaN)}`
            const dArtist: string = this.data.artist ?? NSPanelConstants.STR_EMPTY
            const dArtistColor: string = `${NSPanelColorUtils.toHmiColor(this.data.artistColor ?? NaN)}`
            const dVolume: string = `${NSPanelUtils.limitNumberToRange(
                this.data.volume,
                VOLUME_MIN,
                VOLUME_MAX,
                DEFAULT_VOLUME
            )}`
            const dIconPlayPause: string =
                this.data.iconPlayPause != null ? this.data.iconPlayPause : this.config.iconPlayPause
            const dOnOffButton: string = this.config.hasOnOffButton
                ? `${NSPanelColorUtils.toHmiColor(this.config.onOffButtonColor)}`
                : NSPanelConstants.STR_DISABLE
            const dIconShuffle: string = this.config.hasIconShuffle
                ? this.config.shuffleIcon ?? NSPanelConstants.STR_DISABLE
                : NSPanelConstants.STR_DISABLE

            hmiCmdParams.push(this.entitiesPageNodeConfig.title ?? NSPanelConstants.STR_EMPTY)

            hmiCmdParams.push(titleNav)

            hmiCmdParams.push(this.config?.id)

            hmiCmdParams.push(dTitle)
            hmiCmdParams.push(dTitleColor)
            hmiCmdParams.push(dArtist)
            hmiCmdParams.push(dArtistColor)
            hmiCmdParams.push(dVolume)

            hmiCmdParams.push(NSPanelUtils.getIcon(dIconPlayPause ?? DEFAULT_ICON_PLAY_PAUSE))
            hmiCmdParams.push(dOnOffButton) // onOffBtn, "disable" or color
            hmiCmdParams.push(NSPanelUtils.getIcon(dIconShuffle)) // iconShuffle, "disable" or icon

            const entitites = this.generateEntities()
            hmiCmdParams.push(entitites)

            const hmiCmd: HMICommand = {
                cmd: NSPanelConstants.STR_LUI_CMD_ENTITYUPDATE,
                params: hmiCmdParams,
            }
            return hmiCmd
        }
    }

    RED.nodes.registerType('nspanel-page-media', PageMediaNode)
}
