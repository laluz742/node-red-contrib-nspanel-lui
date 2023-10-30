import { IconProvider } from './icon-provider'
import { NodeBase } from './node-base'
import { ActiveCharacteristic, INodeConfig, PanelColor, SplitTime } from '../types/types'
import * as NSPanelConstants from './nspanel-constants'

export class NSPanelUtils {
    public static i18n(node: NodeBase<INodeConfig>, key: string, dict: string, group?: string) {
        return node.RED._(`node-red-contrib-nspanel-lui/${dict}:${group ?? dict}.${key}`)
    }

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
        if (type === NSPanelConstants.STR_LUI_ENTITY_NONE) {
            return `${NSPanelConstants.STR_LUI_ENTITY_NONE}${NSPanelConstants.STR_LUI_DELIMITER.repeat(5)}`
        }

        return `${type}${NSPanelConstants.STR_LUI_DELIMITER}${entityId ?? NSPanelConstants.STR_EMPTY}${
            NSPanelConstants.STR_LUI_DELIMITER
        }${icon ?? NSPanelConstants.STR_EMPTY}${NSPanelConstants.STR_LUI_DELIMITER}${
            iconColor ?? NSPanelConstants.STR_EMPTY
        }${NSPanelConstants.STR_LUI_DELIMITER}${displayName ?? NSPanelConstants.STR_EMPTY}${
            NSPanelConstants.STR_LUI_DELIMITER
        }${optionalValue ?? NSPanelConstants.STR_EMPTY}`
    }

    public static makeIcon(
        icon: string | null | undefined,
        iconColor: PanelColor | undefined | null,
        value?: string
    ): string {
        return `${icon ?? NSPanelConstants.STR_EMPTY}${value ?? NSPanelConstants.STR_EMPTY}${
            NSPanelConstants.STR_LUI_DELIMITER
        }${iconColor ?? NSPanelConstants.STR_EMPTY}`
    }

    public static splitTime(str: string | undefined): SplitTime {
        if (str === undefined) return { hours: -1, minutes: -1 }

        const parts = str.split(':')

        const h = Number(parts[0])
        const m = Number(parts[1])

        if (Number.isNaN(h) || Number.isNaN(m)) return { hours: -1, minutes: -1 }

        return { hours: h, minutes: m }
    }

    public static isString(e: any): boolean {
        return typeof e === 'string'
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

    public static limitNumberToRange(v: any, min: number, max: number, defaultValue: number): number {
        const n = Number(v)
        if (Number.isNaN(n)) return defaultValue === undefined ? min : defaultValue

        if (v < min) return min
        if (v > max) return max

        return v
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
