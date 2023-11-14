import { NodeBase } from './node-base'
import { NSPanelColorUtils } from './nspanel-colorutils'
import { NSPanelUtils } from './nspanel-utils'
import { Logger } from './logger'
import {
    FanEntityData,
    HMICommand,
    HMICommandParameters,
    INodeConfig,
    InputSelectEntityData,
    LightEntityData,
    NotifyData,
    PageEntityData,
    PanelEntity,
    ShutterEntityData,
    ThermoEntityData,
    TimerEntityData,
} from '../types/types'
import * as NSPanelConstants from './nspanel-constants'

const log = Logger('NSPanelController')

export class NSPanelPopupHelpers {
    public static generatePopup(
        type: string,
        node: NodeBase<INodeConfig>,
        entity: PanelEntity,
        entityData: PageEntityData | null
    ): HMICommand | null {
        let result: HMICommand | null

        switch (type) {
            case 'popupFan':
                result = NSPanelPopupHelpers.generatePopupFan(node, entity, entityData)
                break

            case 'popupLight':
                result = NSPanelPopupHelpers.generatePopupLight(node, entity, entityData)
                break

            case 'popupShutter':
                result = NSPanelPopupHelpers.generatePopupShutter(node, entity, entityData)
                break

            case 'popupInSel':
                result = NSPanelPopupHelpers.generatePopupInputSelect(node, entity, entityData)
                break

            case 'popupThermo':
                result = NSPanelPopupHelpers.generatePopupThermo(node, entity, entityData)
                break

            case 'popupTimer':
                result = NSPanelPopupHelpers.generatePopupTimer(node, entity, entityData)
                break

            default:
                log.debug(`Popup type ${entity.type} is not supported, yet.`)
                result = null
                break
        }

        return result
    }

    public static generatePopupNotify(notifyData?: NotifyData): HMICommand | null {
        if (notifyData == null || typeof notifyData !== 'object') {
            return null
        }

        const result: (string | number)[] = []

        result.push(notifyData.notifyId ?? NSPanelConstants.STR_EMPTY)
        result.push(notifyData.heading ?? NSPanelConstants.STR_EMPTY)
        result.push(NSPanelColorUtils.toHmiColor(notifyData.headingColor ?? NSPanelConstants.DEFAULT_LUI_COLOR))
        result.push(notifyData.cancelText ?? NSPanelConstants.STR_EMPTY)
        result.push(NSPanelColorUtils.toHmiColor(notifyData.cancelColor ?? NSPanelConstants.DEFAULT_LUI_COLOR))
        result.push(notifyData.okText ?? NSPanelConstants.STR_EMPTY)
        result.push(NSPanelColorUtils.toHmiColor(notifyData.okColor ?? NSPanelConstants.DEFAULT_LUI_COLOR))
        result.push(notifyData.text ?? NSPanelConstants.STR_EMPTY)
        result.push(NSPanelColorUtils.toHmiColor(notifyData.textColor ?? NSPanelConstants.DEFAULT_LUI_COLOR))
        result.push(notifyData.timeout ?? NSPanelConstants.STR_EMPTY)
        result.push(notifyData.fontSize ?? NSPanelConstants.DEFAULT_FONTSIZE)
        result.push(NSPanelUtils.getIcon(notifyData.icon ?? NSPanelConstants.STR_EMPTY))
        result.push(NSPanelColorUtils.toHmiColor(notifyData.iconColor ?? NSPanelConstants.DEFAULT_LUI_COLOR))

        const hmiCmd: HMICommand = {
            cmd: NSPanelConstants.STR_LUI_CMD_ENTITYUPDATEDETAIL,
            params: result,
        }
        return hmiCmd
    }

    private static generatePopupFan(
        _node: NodeBase<INodeConfig>,
        entity: PanelEntity,
        entityData: PageEntityData | null
    ): HMICommand | null {
        const fanEntityData: FanEntityData = <FanEntityData>entityData
        const result: HMICommandParameters = []

        result.push(entity.entityId)
        result.push(NSPanelUtils.getIcon(entity.icon ?? NSPanelConstants.STR_EMPTY))
        result.push(NSPanelColorUtils.toHmiColor(entity.iconColor ?? NSPanelConstants.DEFAULT_LUI_COLOR))
        result.push(NSPanelUtils.toHmiState(fanEntityData?.active ?? 0))
        result.push(fanEntityData?.speed ?? NSPanelConstants.STR_EMPTY)
        result.push(entity.max ?? NSPanelConstants.STR_EMPTY)
        result.push(fanEntityData?.text ?? NSPanelConstants.STR_EMPTY)
        result.push(fanEntityData?.mode ?? NSPanelConstants.STR_EMPTY) // current mode value
        result.push(`${entity.fanMode1}?${entity.fanMode2}?${entity.fanMode3}`)

        const hmiCmd: HMICommand = {
            cmd: NSPanelConstants.STR_LUI_CMD_ENTITYUPDATEDETAIL,
            params: result,
        }
        return hmiCmd
    }

    private static generatePopupLight(
        node: NodeBase<INodeConfig>,
        entity: PanelEntity,
        entityData: PageEntityData | null
    ): HMICommand | null {
        // entity data might be undefined, if nothing received yet
        // if (entityData == null) return null

        const lightEntityData: LightEntityData = <LightEntityData>entityData
        const result: HMICommandParameters = []

        const brightness = entity.dimmable ? lightEntityData?.brightness : NSPanelConstants.STR_DISABLE
        const colorTemp = entity.hasColorTemperature ? lightEntityData?.colorTemperature : NSPanelConstants.STR_DISABLE
        const colorMode = entity.hasColor ? '1' : NSPanelConstants.STR_DISABLE // TODO: check with HMI code
        const strColor = NSPanelUtils.i18n(node, 'light.color', 'nspanel-panel', 'common')
        const strColorTemp = NSPanelUtils.i18n(node, 'light.temperature', 'nspanel-panel', 'common')
        const strBrightness = NSPanelUtils.i18n(node, 'light.brightness', 'nspanel-panel', 'common')

        result.push(entity.entityId)
        result.push(NSPanelUtils.getIcon(entity.icon ?? NSPanelConstants.STR_EMPTY))
        result.push(`${NSPanelColorUtils.toHmiColor(entity.iconColor ?? NSPanelConstants.DEFAULT_LUI_COLOR)}`)
        result.push(NSPanelUtils.toHmiState(lightEntityData?.active ?? 0))
        result.push(brightness ?? NSPanelConstants.STR_EMPTY)
        result.push(colorTemp ?? NSPanelConstants.STR_EMPTY)
        result.push(colorMode)
        result.push(entity.hasColor ? strColor : NSPanelConstants.STR_EMPTY)
        result.push(entity.hasColorTemperature ? strColorTemp : NSPanelConstants.STR_EMPTY)
        result.push(entity.dimmable ? strBrightness : NSPanelConstants.STR_EMPTY)

        const hmiCmd: HMICommand = {
            cmd: NSPanelConstants.STR_LUI_CMD_ENTITYUPDATEDETAIL,
            params: result,
        }
        return hmiCmd
    }

    private static generatePopupShutter(
        node: NodeBase<INodeConfig>,
        entity: PanelEntity,
        entityData: PageEntityData | null
    ): HMICommand | null {
        // entity data might be undefined, if nothing received yet
        const shutterEntityData: ShutterEntityData = entityData as ShutterEntityData // TODO: type guard
        const hmiCmdParams: HMICommandParameters = []

        const hasTilt: boolean = entity.hasTilt ?? false
        const posValue: number = Number(shutterEntityData?.value ?? 0)
        const tiltValue: number = Number(shutterEntityData?.tilt ?? 0)

        hmiCmdParams.push(entity.entityId)
        hmiCmdParams.push(posValue ?? NSPanelConstants.STR_EMPTY)
        hmiCmdParams.push(shutterEntityData?.text ?? NSPanelConstants.STR_EMPTY)
        hmiCmdParams.push(NSPanelUtils.i18n(node, 'shutter.position', 'nspanel-panel', 'common'))
        hmiCmdParams.push(NSPanelUtils.getIcon(entity.icon ?? NSPanelConstants.STR_EMPTY))
        hmiCmdParams.push(NSPanelUtils.getIcon(entity.iconUp ?? NSPanelConstants.STR_EMPTY))
        hmiCmdParams.push(NSPanelUtils.getIcon(entity.iconStop ?? NSPanelConstants.STR_EMPTY))
        hmiCmdParams.push(NSPanelUtils.getIcon(entity.iconDown ?? NSPanelConstants.STR_EMPTY))
        hmiCmdParams.push(posValue < 100 ? NSPanelConstants.STR_ENABLE : NSPanelConstants.STR_DISABLE)
        hmiCmdParams.push(NSPanelConstants.STR_ENABLE) // icon_stop_status
        hmiCmdParams.push(posValue > 0 ? NSPanelConstants.STR_ENABLE : NSPanelConstants.STR_DISABLE)

        if (hasTilt) {
            hmiCmdParams.push(NSPanelUtils.i18n(node, 'shutter.tilt', 'nspanel-panel', 'common'))
            hmiCmdParams.push(NSPanelUtils.getIcon(entity.iconTiltLeft ?? NSPanelConstants.STR_EMPTY))
            hmiCmdParams.push(NSPanelUtils.getIcon(entity.iconTiltStop ?? NSPanelConstants.STR_EMPTY))
            hmiCmdParams.push(NSPanelUtils.getIcon(entity.iconTiltRight ?? NSPanelConstants.STR_EMPTY))
            hmiCmdParams.push(tiltValue < 100 ? NSPanelConstants.STR_ENABLE : NSPanelConstants.STR_DISABLE) // iconTiltLeftStatus
            hmiCmdParams.push(NSPanelConstants.STR_ENABLE) // iconTiltStopStatus
            hmiCmdParams.push(tiltValue > 0 ? NSPanelConstants.STR_ENABLE : NSPanelConstants.STR_DISABLE) // iconTiltRightStatus
            hmiCmdParams.push(shutterEntityData?.tilt ?? 0)
        } else {
            hmiCmdParams.push(NSPanelConstants.STR_LUI_DELIMITER.repeat(7) + NSPanelConstants.STR_DISABLE)
        }

        const hmiCmd: HMICommand = {
            cmd: NSPanelConstants.STR_LUI_CMD_ENTITYUPDATEDETAIL,
            params: hmiCmdParams,
        }
        return hmiCmd
    }

    private static generatePopupInputSelect(
        _node: NodeBase<INodeConfig>,
        entity: PanelEntity,
        entityData: PageEntityData | null
    ): HMICommand | null {
        const inputSelectEntityData: InputSelectEntityData = entityData as InputSelectEntityData // TODO: type guard
        const hmiCmdParams: HMICommandParameters = []

        hmiCmdParams.push(entity.entityId)
        hmiCmdParams.push(NSPanelConstants.STR_EMPTY) // icon ignored
        hmiCmdParams.push(`${NSPanelColorUtils.toHmiColor(entity.iconColor ?? NSPanelConstants.DEFAULT_LUI_COLOR)}`)

        if (inputSelectEntityData != null) {
            const optionsString: string = Array.isArray(inputSelectEntityData?.options)
                ? inputSelectEntityData?.options?.join(NSPanelConstants.STR_LUI_LIST_DELIMITER)
                : inputSelectEntityData?.options

            hmiCmdParams.push(inputSelectEntityData?.mode ?? NSPanelConstants.STR_EMPTY)
            hmiCmdParams.push(inputSelectEntityData?.selectedOption ?? NSPanelConstants.STR_EMPTY) // TODO: text like 'no data'??
            hmiCmdParams.push(optionsString ?? NSPanelConstants.STR_EMPTY)
        }

        const hmiCmd: HMICommand = {
            cmd: NSPanelConstants.STR_LUI_CMD_ENTITYUPDATEDETAIL2,
            params: hmiCmdParams,
        }
        return hmiCmd
    }

    private static generatePopupThermo(
        _node: NodeBase<INodeConfig>,
        entity: PanelEntity,
        entityData: PageEntityData | null
    ): HMICommand | null {
        const thermoEntityData: ThermoEntityData = entityData as ThermoEntityData // TODO: type guard
        const hmiCmdParams: HMICommandParameters = []

        const heading: string = thermoEntityData?.heading ?? NSPanelConstants.STR_EMPTY
        const mode: string = thermoEntityData?.mode ?? NSPanelConstants.STR_EMPTY
        const selectedMode: string = thermoEntityData?.selectedOption ?? NSPanelConstants.STR_EMPTY
        const modeList: string =
            (Array.isArray(thermoEntityData?.options)
                ? thermoEntityData?.options?.join(NSPanelConstants.STR_LUI_LIST_DELIMITER)
                : thermoEntityData?.options) ?? NSPanelConstants.STR_EMPTY

        const heading1: string = thermoEntityData?.heading1 ?? NSPanelConstants.STR_EMPTY
        const mode1: string = thermoEntityData?.mode1 ?? NSPanelConstants.STR_EMPTY
        const selectedMode1: string = thermoEntityData?.selectedOption ?? NSPanelConstants.STR_EMPTY
        const modeList1: string =
            (Array.isArray(thermoEntityData?.options1)
                ? thermoEntityData?.options1?.join(NSPanelConstants.STR_LUI_LIST_DELIMITER)
                : thermoEntityData?.options1) ?? NSPanelConstants.STR_EMPTY

        const heading2: string = thermoEntityData?.heading2 ?? NSPanelConstants.STR_EMPTY
        const mode2: string = thermoEntityData?.mode2 ?? NSPanelConstants.STR_EMPTY
        const selectedMode2: string = thermoEntityData?.selectedOption ?? NSPanelConstants.STR_EMPTY
        const modeList2: string =
            (Array.isArray(thermoEntityData?.options2)
                ? thermoEntityData?.options2?.join(NSPanelConstants.STR_LUI_LIST_DELIMITER)
                : thermoEntityData?.options2) ?? NSPanelConstants.STR_EMPTY

        hmiCmdParams.push(entity.entityId)
        hmiCmdParams.push(NSPanelUtils.getIcon(entity.icon ?? NSPanelConstants.STR_EMPTY))
        hmiCmdParams.push(`${NSPanelColorUtils.toHmiColor(entity.iconColor ?? NSPanelConstants.DEFAULT_LUI_COLOR)}`)

        hmiCmdParams.push(heading)
        hmiCmdParams.push(mode)
        hmiCmdParams.push(selectedMode)
        hmiCmdParams.push(modeList)

        hmiCmdParams.push(heading1)
        hmiCmdParams.push(mode1)
        hmiCmdParams.push(selectedMode1)
        hmiCmdParams.push(modeList1)

        hmiCmdParams.push(heading2)
        hmiCmdParams.push(mode2)
        hmiCmdParams.push(selectedMode2)
        hmiCmdParams.push(modeList2)

        const hmiCmd: HMICommand = {
            cmd: NSPanelConstants.STR_LUI_CMD_ENTITYUPDATEDETAIL,
            params: hmiCmdParams,
        }
        return hmiCmd
    }

    private static generatePopupTimer(
        _node: NodeBase<INodeConfig>,
        entity: PanelEntity,
        entityData: PageEntityData | null
    ): HMICommand | null {
        const timerEntityData: TimerEntityData = entityData as TimerEntityData
        const dAdjustable: string = entity?.adjustable ? '1' : '0' ?? '0'
        const dAction1: string = timerEntityData?.action1 ?? entity?.action1
        const dAction2: string = timerEntityData?.action2 ?? entity?.action2
        const dAction3: string = timerEntityData?.action3 ?? entity?.action3
        const dLabel1: string = timerEntityData?.label1 ?? entity?.label1
        const dLabel2: string = timerEntityData?.label2 ?? entity?.label2
        const dLabel3: string = timerEntityData?.label3 ?? entity?.label3
        const dTimer: number = timerEntityData?.timerRemainingSeconds ?? entity?.timer ?? Number.NaN
        const dTimerMins: number = Number.isNaN(dTimer) ? 0 : Math.floor(dTimer / 60)
        const dTimerSecs: number = Number.isNaN(dTimer) ? 0 : dTimer % 60

        const hmiCmdParams: HMICommandParameters = []
        hmiCmdParams.push(entity.entityId)
        hmiCmdParams.push(NSPanelUtils.getIcon(entity.icon ?? NSPanelConstants.STR_EMPTY))
        hmiCmdParams.push(`${NSPanelColorUtils.toHmiColor(entity.iconColor ?? NSPanelConstants.DEFAULT_LUI_COLOR)}`)
        hmiCmdParams.push(entity.entityId)

        hmiCmdParams.push(dTimerMins)
        hmiCmdParams.push(dTimerSecs)

        hmiCmdParams.push(dAdjustable)

        hmiCmdParams.push(dAction1 ?? NSPanelConstants.STR_EMPTY)
        hmiCmdParams.push(dAction2 ?? NSPanelConstants.STR_EMPTY)
        hmiCmdParams.push(dAction3 ?? NSPanelConstants.STR_EMPTY)
        hmiCmdParams.push(dLabel1 ?? NSPanelConstants.STR_EMPTY)
        hmiCmdParams.push(dLabel2 ?? NSPanelConstants.STR_EMPTY)
        hmiCmdParams.push(dLabel3 ?? NSPanelConstants.STR_EMPTY)

        const hmiCmd: HMICommand = {
            cmd: NSPanelConstants.STR_LUI_CMD_ENTITYUPDATEDETAIL,
            params: hmiCmdParams,
        }
        return hmiCmd
    }
}
