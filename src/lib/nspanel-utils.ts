import { IconProvider } from './icon-provider'
import { STR_LUI_DELIMITER } from './nspanel-constants'
import { ActiveCharacteristic, PanelColor, SplitTime } from '../types/types'

export class NSPanelUtils {
    public static getIcon(name: string | undefined | null): string {
        return name != null ? IconProvider.GetIcon(name) ?? '' : ''
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

        return `${type}${STR_LUI_DELIMITER}${entityId ?? ''}${STR_LUI_DELIMITER}${icon ?? ''}${STR_LUI_DELIMITER}${
            iconColor ?? ''
        }${STR_LUI_DELIMITER}${displayName ?? ''}${STR_LUI_DELIMITER}${optionalValue ?? ''}`
    }

    public static makeIcon(
        icon: string | null | undefined,
        iconColor: PanelColor | undefined | null,
        value?: string
    ): string {
        return `${icon ?? ''}${value ?? ''}${STR_LUI_DELIMITER}${iconColor ?? ''}`
    }

    public static splitTime(str: string | undefined): SplitTime {
        if (str === undefined) return { hours: -1, minutes: -1 }

        const parts = str.split(':')

        const h = Number(parts[0])
        const m = Number(parts[1])

        if (Number.isNaN(h) || Number.isNaN(m)) return { hours: -1, minutes: -1 }

        return { hours: h, minutes: m }
    }

    public static stringIsNullOrEmpty(str: string): boolean {
        return str === undefined || str === null ? true : str.trim().length === 0
    }

    public static toHmiState(active: ActiveCharacteristic): string {
        if (typeof active === 'string') {
            return active === '1' ? '1' : '0'
        }

        return active ? '1' : '0'
    }

    public static convertTemperature(temperature: number, sourceUnit: string, targetUnit: string): number | null {
        if (
            sourceUnit === targetUnit ||
            NSPanelUtils.stringIsNullOrEmpty(sourceUnit) ||
            NSPanelUtils.stringIsNullOrEmpty(targetUnit)
        )
            return temperature

        if (temperature === undefined || temperature == null) return temperature

        let result: number = NaN
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
