import { PageNode } from './page-node'
import { NSPanelUtils } from './nspanel-utils'
import {
    PageOptions,
    NodeAPI,
    IPageNode,
    StatusItemData,
    PageInputMessage,
    NodeRedSendCallback,
    ScreenSaverBaseConfig,
    EventArgs,
} from '../types/types'
import * as NSPanelConstants from './nspanel-constants'
import { NSPanelMessageUtils } from './nspanel-message-utils'

const CMD_STATUSUPDATE: string = 'statusUpdate'

export class ScreenSaverNode<TConfig extends ScreenSaverBaseConfig> extends PageNode<TConfig> implements IPageNode {
    private config: TConfig

    protected statusData: StatusItemData[] = []

    constructor(config: TConfig, RED: NodeAPI, options: PageOptions) {
        super(config, RED, options)

        this.config = config
    }

    protected override handleInput(msg: PageInputMessage, _send: NodeRedSendCallback): boolean {
        if (!NSPanelMessageUtils.hasProperty(msg, 'topic')) return false

        switch (msg.topic) {
            case NSPanelConstants.STR_MSG_TOPIC_STATUS:
                this.handleStatusInput(msg)
                this.requestUpdate()
                return true
        }

        return false
    }

    private handleStatusInput(msg: PageInputMessage): void {
        if (msg.payload === undefined) return

        // TODO: take msg.parts into account to allow to set specific status
        const statusInputData = msg.payload
        const statusItems: StatusItemData[] = this.statusData.map((item) => item)

        if (Array.isArray(statusInputData)) {
            for (let i = 0; i < 2; i += 1) {
                if (statusInputData[i] != null) {
                    const item: StatusItemData = NSPanelMessageUtils.convertToStatusItemData(
                        statusInputData[i]
                    ) as StatusItemData
                    const idx = NSPanelMessageUtils.getPropertyOrDefault(item, 'index', i)
                    statusItems[idx] = item
                }
            }
        } else if (statusInputData != null) {
            const item = NSPanelMessageUtils.convertToStatusItemData(statusInputData) as StatusItemData
            const idx = NSPanelMessageUtils.getPropertyOrDefault(item, 'index', 0)
            statusItems[idx] = item
        }

        this.statusData = statusItems
    }

    protected generateStatusUpdate(): string | null {
        if (this.statusData.length === 0) {
            return null
        }

        let cmd = `${CMD_STATUSUPDATE}${NSPanelConstants.STR_LUI_DELIMITER}`
        const cmdParams: string[] = []

        for (let idx = 0; idx < 2; idx += 1) {
            const item = this.statusData[idx]
            const tmp: string =
                item != null
                    ? NSPanelUtils.makeIcon(
                          (item.prefix ?? '') + NSPanelUtils.getIcon(item.icon) + (item.text ?? ''),
                          item.iconColor
                      )
                    : NSPanelUtils.makeIcon(null, null)
            cmdParams.push(tmp)
        }
        cmd += cmdParams.join(NSPanelConstants.STR_LUI_DELIMITER)
        return cmd
    }

    public override isScreenSaver(): boolean {
        return true
    }

    protected override prePageNavigationEvent(eventArgs: EventArgs, _eventConfig: EventMapping) {
        if (eventArgs.event2 === NSPanelConstants.STR_LUI_EVENT_BEXIT && this.config?.doubleTapToExit) {
            return eventArgs.value ? eventArgs.value >= 2 : false
        }

        return true
    }

    protected getConfig(): TConfig {
        return this.config
    }
}
