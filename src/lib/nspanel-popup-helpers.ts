import { NodeBase } from './node-base'
import { NSPanelColorUtils } from './nspanel-colorutils'
import { NSPanelUtils } from './nspanel-utils'
import { Logger } from './logger'
import {
    FanEntityData,
    INodeConfig,
    LightEntityData,
    NotifyData,
    PageEntityData,
    PanelEntity,
    ShutterEntityData,
} from '../types/types'
import * as NSPanelConstants from './nspanel-constants'

const log = Logger('NSPanelController')

export class NSPanelPopupHelpers {
    public static generatePopup(
        node: NodeBase<INodeConfig>,
        entity: PanelEntity,
        entityData: PageEntityData | null
    ): string | string[] | null {
        let result: string | string[] | null

        switch (entity.type) {
            case 'fan':
                result = NSPanelPopupHelpers.generatePopupFan(node, entity, entityData)
                break

            case 'light':
                result = NSPanelPopupHelpers.generatePopupLight(node, entity, entityData)
                break

            case 'shutter':
                result = NSPanelPopupHelpers.generatePopupShutter(node, entity, entityData)
                break

            case 'thermo':
            case 'input_sel':
            case 'timer':
                // TODO
                break

            default:
                log.debug(`Popup type ${entity.type} is not supported, yet.`)
                result = null
                break
        }

        return result
    }

    public static generatePopupNotify(notifyData?: NotifyData): string | string[] | null {
        if (notifyData == null || typeof notifyData !== 'object') {
            return null
        }

        const result: (string | number)[] = [NSPanelConstants.STR_LUI_CMD_ENTITYUPDATEDETAIL]

        result.push(notifyData.notifyId ?? NSPanelConstants.STR_EMPTY)
        result.push(notifyData.heading ?? NSPanelConstants.STR_EMPTY)
        result.push(NSPanelColorUtils.toHmiIconColor(notifyData.headingColor ?? NSPanelConstants.DEFAULT_LUI_COLOR))
        result.push(notifyData.cancelText ?? NSPanelConstants.STR_EMPTY)
        result.push(NSPanelColorUtils.toHmiIconColor(notifyData.cancelColor ?? NSPanelConstants.DEFAULT_LUI_COLOR))
        result.push(notifyData.okText ?? NSPanelConstants.STR_EMPTY)
        result.push(NSPanelColorUtils.toHmiIconColor(notifyData.okColor ?? NSPanelConstants.DEFAULT_LUI_COLOR))
        result.push(notifyData.text ?? NSPanelConstants.STR_EMPTY)
        result.push(NSPanelColorUtils.toHmiIconColor(notifyData.textColor ?? NSPanelConstants.DEFAULT_LUI_COLOR))
        result.push(notifyData.timeout ?? NSPanelConstants.STR_EMPTY)
        result.push(notifyData.fontSize ?? NSPanelConstants.DEFAULT_FONTSIZE)
        result.push(NSPanelUtils.getIcon(notifyData.icon ?? NSPanelConstants.STR_EMPTY))
        result.push(NSPanelColorUtils.toHmiIconColor(notifyData.iconColor ?? NSPanelConstants.DEFAULT_LUI_COLOR))

        return result.join(NSPanelConstants.STR_LUI_DELIMITER)
    }

    private static generatePopupFan(
        _node: NodeBase<INodeConfig>,
        entity: PanelEntity,
        entityData: PageEntityData | null
    ): string | string[] | null {
        // if (entityData == null) return null

        const fanEntityData: FanEntityData = <FanEntityData>entityData
        const result: (string | number)[] = [NSPanelConstants.STR_LUI_CMD_ENTITYUPDATEDETAIL]

        result.push(entity.entityId)
        result.push(NSPanelUtils.getIcon(entity.icon ?? NSPanelConstants.STR_EMPTY))
        result.push(NSPanelColorUtils.toHmiIconColor(entity.iconColor ?? NSPanelConstants.DEFAULT_LUI_COLOR))
        result.push(NSPanelUtils.toHmiState(fanEntityData?.active ?? 0))
        result.push(fanEntityData?.speed ?? NSPanelConstants.STR_EMPTY)
        result.push(entity.max ?? NSPanelConstants.STR_EMPTY)
        result.push(fanEntityData?.text ?? NSPanelConstants.STR_EMPTY)
        result.push(fanEntityData?.mode ?? NSPanelConstants.STR_EMPTY) // current mode value
        result.push(`${entity.fanMode1}?${entity.fanMode2}?${entity.fanMode3}`)

        return result.join(NSPanelConstants.STR_LUI_DELIMITER)
    }

    private static generatePopupLight(
        node: NodeBase<INodeConfig>,
        entity: PanelEntity,
        entityData: PageEntityData | null
    ): string | string[] | null {
        // entity data might be undefined, if nothing received yet
        // if (entityData == null) return null

        const lightEntityData: LightEntityData = <LightEntityData>entityData
        const result: (string | number)[] = [NSPanelConstants.STR_LUI_CMD_ENTITYUPDATEDETAIL]

        result.push(entity.entityId)
        result.push(NSPanelUtils.getIcon(entity.icon ?? NSPanelConstants.STR_EMPTY))
        result.push(`${NSPanelColorUtils.toHmiIconColor(entity.iconColor ?? NSPanelConstants.DEFAULT_LUI_COLOR)}`)

        const brightness = entity.dimmable ? lightEntityData?.brightness : NSPanelConstants.STR_DISABLE
        const colorTemp = entity.hasColorTemperature ? lightEntityData?.colorTemperature : NSPanelConstants.STR_DISABLE
        const colorMode = entity.hasColor ? '1' : NSPanelConstants.STR_DISABLE // TODO: check with HMI code
        const strColor = NSPanelUtils.i18n(node, 'light.color', 'nspanel-panel', 'common')
        const strColorTemp = NSPanelUtils.i18n(node, 'light.temperature', 'nspanel-panel', 'common')
        const strBrightness = NSPanelUtils.i18n(node, 'light.brightness', 'nspanel-panel', 'common')
        result.push(NSPanelUtils.toHmiState(lightEntityData?.active ?? 0))
        result.push(brightness ?? NSPanelConstants.STR_EMPTY)
        result.push(colorTemp ?? NSPanelConstants.STR_EMPTY)
        result.push(colorMode)
        result.push(entity.hasColor ? strColor : NSPanelConstants.STR_EMPTY)
        result.push(entity.hasColorTemperature ? strColorTemp : NSPanelConstants.STR_EMPTY)
        result.push(entity.dimmable ? strBrightness : NSPanelConstants.STR_EMPTY)

        return result.join(NSPanelConstants.STR_LUI_DELIMITER)
    }

    private static generatePopupShutter(
        node: NodeBase<INodeConfig>,
        entity: PanelEntity,
        entityData: PageEntityData | null
    ): string | string[] | null {
        // entity data might be undefined, if nothing received yet
        // if (entityData == null) return null

        const shutterEntityData: ShutterEntityData = entityData as ShutterEntityData // TODO: type guard
        const result: (string | number)[] = [NSPanelConstants.STR_LUI_CMD_ENTITYUPDATEDETAIL]

        const hasTilt: boolean = entity.hasTilt ?? false
        const posValue: number = Number(shutterEntityData?.value ?? 0)
        const tiltValue: number = Number(shutterEntityData?.tilt ?? 0)

        result.push(entity.entityId)
        result.push(posValue ?? NSPanelConstants.STR_EMPTY)
        result.push(shutterEntityData?.text ?? NSPanelConstants.STR_EMPTY)
        result.push(NSPanelUtils.i18n(node, 'shutter.position', 'nspanel-panel', 'common'))
        result.push(NSPanelUtils.getIcon(entity.icon ?? NSPanelConstants.STR_EMPTY))
        result.push(NSPanelUtils.getIcon(entity.iconUp ?? NSPanelConstants.STR_EMPTY))
        result.push(NSPanelUtils.getIcon(entity.iconStop ?? NSPanelConstants.STR_EMPTY))
        result.push(NSPanelUtils.getIcon(entity.iconDown ?? NSPanelConstants.STR_EMPTY))
        result.push(posValue < 100 ? NSPanelConstants.STR_ENABLE : NSPanelConstants.STR_DISABLE)
        result.push(NSPanelConstants.STR_ENABLE) // icon_stop_status
        result.push(posValue > 0 ? NSPanelConstants.STR_ENABLE : NSPanelConstants.STR_DISABLE)

        if (hasTilt) {
            result.push(NSPanelUtils.i18n(node, 'shutter.tilt', 'nspanel-panel', 'common'))
            result.push(NSPanelUtils.getIcon(entity.iconTiltLeft ?? NSPanelConstants.STR_EMPTY))
            result.push(NSPanelUtils.getIcon(entity.iconTiltStop ?? NSPanelConstants.STR_EMPTY))
            result.push(NSPanelUtils.getIcon(entity.iconTiltRight ?? NSPanelConstants.STR_EMPTY))
            result.push(tiltValue < 100 ? NSPanelConstants.STR_ENABLE : NSPanelConstants.STR_DISABLE) // iconTiltLeftStatus
            result.push(NSPanelConstants.STR_ENABLE) // iconTiltStopStatus
            result.push(tiltValue > 0 ? NSPanelConstants.STR_ENABLE : NSPanelConstants.STR_DISABLE) // iconTiltRightStatus
            result.push(shutterEntityData?.tilt ?? 0)
        } else {
            result.push(NSPanelConstants.STR_LUI_DELIMITER.repeat(7) + NSPanelConstants.STR_DISABLE)
        }

        return result.join(NSPanelConstants.STR_LUI_DELIMITER)
    }
}
