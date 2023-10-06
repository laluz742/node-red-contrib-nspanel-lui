import { FanEntityData, LightEntityData, NotifyData, PageEntityData, PanelEntity, ShutterEntityData } from '../types'
import {
    DEFAULT_FONTSIZE,
    DEFAULT_HMI_COLOR,
    STR_CMD_LUI_ENTITYUPDATEDETAIL,
    STR_LUI_DELIMITER,
    STR_DISABLE,
    STR_EMPTY,
    STR_ENABLE,
} from './nspanel-constants'
import { NSPanelUtils } from './nspanel-utils'

export class NSPanelPopupHelpers {
    public static generatePopup(entity: PanelEntity, entityData: PageEntityData): string | string[] | null {
        var result: string | string[] = null

        switch (entity.type) {
            case 'fan':
                result = NSPanelPopupHelpers.generatePopupFan(entity, entityData)
                break

            case 'light':
                result = NSPanelPopupHelpers.generatePopupLight(entity, entityData)
                break

            case 'shutter':
                result = NSPanelPopupHelpers.generatePopupShutter(entity, entityData)
                break

            case 'thermo':
            case 'input_sel':
            case 'timer':
                //TODO
                break
        }

        return result
    }

    public static generatePopupNotify(notifyData?: NotifyData): string | string[] | null {
        if (notifyData === undefined || notifyData === null || typeof notifyData !== 'object') {
            return null
        }

        const result: (string | Number)[] = [STR_CMD_LUI_ENTITYUPDATEDETAIL]

        result.push(notifyData.notifyId ?? STR_EMPTY)
        result.push(notifyData.heading ?? STR_EMPTY)
        result.push(NSPanelUtils.toHmiIconColor(notifyData.headingColor ?? DEFAULT_HMI_COLOR))
        result.push(notifyData.cancelText ?? STR_EMPTY)
        result.push(NSPanelUtils.toHmiIconColor(notifyData.cancelColor ?? DEFAULT_HMI_COLOR))
        result.push(notifyData.okText ?? STR_EMPTY)
        result.push(NSPanelUtils.toHmiIconColor(notifyData.okColor ?? DEFAULT_HMI_COLOR))
        result.push(notifyData.text ?? STR_EMPTY)
        result.push(NSPanelUtils.toHmiIconColor(notifyData.textColor ?? DEFAULT_HMI_COLOR))
        result.push(notifyData.timeout ?? STR_EMPTY)
        result.push(notifyData.fontSize ?? DEFAULT_FONTSIZE)
        result.push(NSPanelUtils.getIcon(notifyData.icon ?? STR_EMPTY))
        result.push(NSPanelUtils.toHmiIconColor(notifyData.iconColor ?? DEFAULT_HMI_COLOR))

        return result.join(STR_LUI_DELIMITER)
    }

    private static generatePopupFan(entity: PanelEntity, entityData: PageEntityData): string | string[] | null {
        const fanEntityData: FanEntityData = <FanEntityData>entityData
        const result: (string | Number)[] = [STR_CMD_LUI_ENTITYUPDATEDETAIL]

        result.push(entity.entityId)
        result.push(NSPanelUtils.getIcon(entity.icon ?? STR_EMPTY))
        result.push(NSPanelUtils.toHmiIconColor(entity.iconColor ?? DEFAULT_HMI_COLOR))
        result.push(NSPanelUtils.toHmiState(fanEntityData?.active ?? 0))
        result.push(fanEntityData?.speed ?? STR_EMPTY)
        result.push(entity.max ?? STR_EMPTY)
        result.push(fanEntityData?.text ?? STR_EMPTY)
        result.push(fanEntityData?.mode ?? STR_EMPTY) // current mode value
        result.push(`${entity.fanMode1}?${entity.fanMode2}?${entity.fanMode3}`)

        return result.join('~')
    }

    private static generatePopupLight(entity: PanelEntity, entityData: PageEntityData): string | string[] | null {
        const lightEntityData: LightEntityData = <LightEntityData>entityData
        const result: (string | Number)[] = [STR_CMD_LUI_ENTITYUPDATEDETAIL]

        result.push(entity.entityId)
        result.push(NSPanelUtils.getIcon(entity.icon ?? STR_EMPTY))
        result.push('' + NSPanelUtils.toHmiIconColor(entity.iconColor ?? DEFAULT_HMI_COLOR))

        const brightness = entity.dimmable ? lightEntityData?.brightness : STR_DISABLE
        const colorTemp = entity.hasColorTemperature ? lightEntityData?.colorTemperature : STR_DISABLE
        const colorMode = entity.hasColor ? '1' : STR_DISABLE // FIXME: check with HMI
        result.push(NSPanelUtils.toHmiState(lightEntityData?.active ?? 0))
        result.push(brightness)
        result.push(colorTemp)
        result.push(colorMode)
        result.push(entity.hasColor ? 'Farbe' : STR_EMPTY) //FIXME: i18n
        result.push(entity.hasColorTemperature ? 'Lichttemperatur' : STR_EMPTY) //FIXME: i18n
        result.push(entity.dimmable ? 'Helligkeit' : STR_EMPTY) //FIXME: i18n

        return result.join(STR_LUI_DELIMITER)
    }

    private static generatePopupShutter(entity: PanelEntity, entityData: PageEntityData): string | string[] | null {
        const shutterEntityData: ShutterEntityData = <ShutterEntityData>entityData // TODO: type guard
        const result: (string | Number)[] = [STR_CMD_LUI_ENTITYUPDATEDETAIL]

        const hasTilt: boolean = entity.hasTilt ?? false
        const posValue: number = Number(shutterEntityData?.value ?? 0)
        const tiltValue: number = Number(shutterEntityData?.tilt ?? 0)

        result.push(entity.entityId)
        result.push(posValue ?? STR_EMPTY)
        result.push(shutterEntityData?.text ?? STR_EMPTY)
        result.push('Position') // FIXME: i18n
        result.push(NSPanelUtils.getIcon(entity.icon ?? STR_EMPTY))
        result.push(NSPanelUtils.getIcon(entity.iconUp ?? STR_EMPTY))
        result.push(NSPanelUtils.getIcon(entity.iconStop ?? STR_EMPTY))
        result.push(NSPanelUtils.getIcon(entity.iconDown ?? STR_EMPTY))
        result.push(posValue < 100 ? STR_ENABLE : STR_DISABLE)
        result.push(STR_ENABLE) //icon_stop_status
        result.push(posValue > 0 ? STR_ENABLE : STR_DISABLE)

        if (hasTilt) {
            result.push('Neigung') // TODO:i18n
            result.push(NSPanelUtils.getIcon(entity.iconTiltLeft ?? STR_EMPTY))
            result.push(NSPanelUtils.getIcon(entity.iconTiltStop ?? STR_EMPTY))
            result.push(NSPanelUtils.getIcon(entity.iconTiltRight ?? STR_EMPTY))
            result.push(tiltValue < 100 ? STR_ENABLE : STR_DISABLE) //iconTiltLeftStatus
            result.push(STR_ENABLE) //iconTiltStopStatus
            result.push(tiltValue > 0 ? STR_ENABLE : STR_DISABLE) //iconTiltRightStatus
            result.push(shutterEntityData?.tilt ?? 0)
        } else {
            result.push(STR_LUI_DELIMITER.repeat(7) + STR_DISABLE)
        }

        return result.join(STR_LUI_DELIMITER)
    }
}