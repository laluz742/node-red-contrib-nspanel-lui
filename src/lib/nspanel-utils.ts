import { IconProvider } from './icon-provider'
import { ActiveCharacteristic, HSVColor, PanelColor, RGBColor, RGBHSVTuple, SplitTime } from '../types'
import { NSPanelColorUtils } from './nspanel-colorutils'
import { DEFAULT_HMI_COLOR } from './nspanel-constants'

export class NSPanelUtils {
    public static getIcon(name: string): string {
        return IconProvider.GetIcon(name) ?? ''
    }

    public static makeEntity(
        type: string,
        entityId?: string,
        icon?: string,
        iconColor?: number,
        displayName?: string,
        optionalValue?: string | number
    ): string {
        if (type === 'delete') return 'delete~~~~~'

        return `${type}~${entityId ?? ''}~${icon ?? ''}~${iconColor ?? ''}~${displayName ?? ''}~${optionalValue ?? ''}`
    }

    public static makeIcon(icon: string | null | undefined, iconColor: PanelColor | null, value?: string): string {
        return `${icon ?? ''}${value ?? ''}~${iconColor ?? ''}`
    }

    // #region colors
    public static toHmiIconColor(color: string | number | number[], defaultColor: number = DEFAULT_HMI_COLOR): number {
        var result = Number(color)
        if (!isNaN(result)) return result

        if (typeof color === 'string' || Array.isArray(color)) {
            return NSPanelColorUtils.color2dec565(color, defaultColor)
        }

        return defaultColor
    }

    public static hmiPosToColor(x: number, y: number): RGBHSVTuple {
        let r = 160 / 2
        x = Math.round(((x - r) / r) * 100) / 100
        y = Math.round(((r - y) / r) * 100) / 100

        r = Math.sqrt(x * x + y * y)
        var saturation = 0
        if (r > 1) {
            saturation = 0
        } else {
            saturation = r
        }

        const hue = NSPanelColorUtils.rad2deg(Math.atan2(y, x))
        const hsv: HSVColor = { hue: hue, saturation: saturation, value: 1 } //FIXME: brightness input
        const rgb: RGBColor = NSPanelColorUtils.hsv2Rgb(hsv)

        return [rgb, hsv]
    }
    // #endregion colors

    public static splitTime(str: string | undefined): SplitTime {
        if (str === undefined) return { hours: -1, minutes: -1 }

        var parts = str.split(':')

        var h = Number(parts[0])
        var m = Number(parts[1])

        if (isNaN(h) || isNaN(m)) return { hours: -1, minutes: -1 }

        return { hours: h, minutes: m }
    }

    public static stringIsNullOrEmpty(str: string): boolean {
        return str === undefined || str === null ? true : str.trim().length == 0
    }

    public static toHmiState(active: ActiveCharacteristic): string {
        if (typeof active === 'string') {
            return active === '1' ? '1' : '0'
        }

        return active ? '1' : '0'
    }

    public static convertTemperature(
        temperature: number,
        sourceUnit: string,
        targetUnit: string
    ): number | null | undefined {
        if (
            sourceUnit == targetUnit ||
            NSPanelUtils.stringIsNullOrEmpty(sourceUnit) ||
            NSPanelUtils.stringIsNullOrEmpty(targetUnit)
        )
            return temperature

        if (temperature === undefined || temperature == null) return temperature

        var result = null
        switch (targetUnit.toLowerCase()) {
            case 'c':
            case '°c':
                result = (5 / 9) * (temperature - 32)
                break

            case 'f':
            case '°f':
                result = (temperature * 9) / 5 + 32
                break
        }

        return result
    }
}
