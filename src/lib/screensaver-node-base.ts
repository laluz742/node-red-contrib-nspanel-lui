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
    InputHandlingResult,
    HMICommand,
    HMICommandParameters,
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

    protected override handleInput(msg: PageInputMessage, _send: NodeRedSendCallback): InputHandlingResult {
        if (!NSPanelMessageUtils.hasProperty(msg, 'topic')) return { handled: false }

        switch (msg.topic) {
            case NSPanelConstants.STR_MSG_TOPIC_STATUS:
                this.handleStatusInput(msg)
                this.requestUpdate()
                return { handled: true, requestUpdate: true }

            case NSPanelConstants.STR_MSG_TOPIC_NOTIFY:
                this.handleNotifyInput(msg)
                return { handled: true, requestUpdate: false }
        }

        return { handled: false }
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

        const hmiCmdParams: HMICommandParameters = []
        hmiCmdParams.push(heading)
        hmiCmdParams.push(text)
        hmiCmdParams.push(headingColor)
        hmiCmdParams.push(textColor)

        const hmiCmd: HMICommand = {
            cmd: NSPanelConstants.STR_LUI_CMD_NOTIFY,
            params: hmiCmdParams,
        }

        this.sendToPanel(hmiCmd)
    }

    protected generateStatusUpdate(): HMICommand | null {
        if (this.statusData.length === 0) {
            return null
        }

        const hmiCmdParams: HMICommandParameters = []

        for (let idx = 0; idx < 2; idx += 1) {
            const item = this.statusData[idx]
            const tmp: string =
                item != null
                    ? NSPanelUtils.makeIcon(
                          (item.prefix ?? '') + NSPanelUtils.getIcon(item.icon) + (item.text ?? ''),
                          item.iconColor
                      )
                    : NSPanelUtils.makeIcon(null, null)
            hmiCmdParams.push(tmp)
        }

        const hmiCmd: HMICommand = {
            cmd: CMD_STATUSUPDATE,
            params: hmiCmdParams,
        }

        return hmiCmd
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
