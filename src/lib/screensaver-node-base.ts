import { PageNodeBase } from './page-node-base'
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
    NotifyData,
    PanelColor,
} from '../types/types'
import * as NSPanelConstants from './nspanel-constants'
import { NSPanelMessageUtils } from './nspanel-message-utils'
import { NSPanelColorUtils } from './nspanel-colorutils'

const CMD_STATUSUPDATE: string = 'statusUpdate'

export class ScreenSaverNodeBase<TConfig extends ScreenSaverBaseConfig>
    extends PageNodeBase<TConfig>
    implements IPageNode
{
    private config: TConfig

    private statusData: StatusItemData[] = []

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

            case NSPanelConstants.STR_MSG_TOPIC_NOTIFY:
                this.handleNotifyInput(msg)
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
                    if (idx === 0 || idx === 1) {
                        statusItems[idx] = item
                    }
                }
            }
        } else if (statusInputData != null) {
            const item = NSPanelMessageUtils.convertToStatusItemData(statusInputData) as StatusItemData
            const idx = NSPanelMessageUtils.getPropertyOrDefault(item, 'index', 0)
            statusItems[idx] = item
        }

        this.statusData = statusItems
    }

    private handleNotifyInput(msg: PageInputMessage): void {
        // notify~head~text~1234~5432
        const data: NotifyData = msg.payload as NotifyData

        const heading: string = data?.heading
        const headingColor: PanelColor = NSPanelColorUtils.toHmiColor(data?.headingColor)
        const text: string = data?.text
        const textColor: PanelColor = NSPanelColorUtils.toHmiColor(data?.textColor)

        if (NSPanelUtils.stringIsNullOrEmpty(heading) && NSPanelUtils.stringIsNullOrEmpty(text)) return

        let cmd = `${NSPanelConstants.STR_LUI_CMD_NOTIFY}${NSPanelConstants.STR_LUI_DELIMITER}`
        cmd += `${heading}${NSPanelConstants.STR_LUI_DELIMITER}`
        cmd += `${text}${NSPanelConstants.STR_LUI_DELIMITER}${headingColor}`
        cmd += `${NSPanelConstants.STR_LUI_DELIMITER}${textColor}`
        this.sendToPanel(cmd)
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
