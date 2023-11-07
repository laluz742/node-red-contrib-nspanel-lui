import { DEFAULT_LUI_COLOR } from './nspanel-constants'
import { NSPanelColorUtils } from './nspanel-colorutils'
import { BuzzerCommandParams, CommandData, PageEntityData, StatusItemData, SwitchCommandParams } from '../types/types'
import { NSPanelUtils } from './nspanel-utils'

const DEFAULT_STATUS: StatusItemData = { icon: undefined, iconColor: DEFAULT_LUI_COLOR, text: undefined }
const DEFAULT_DATA: PageEntityData = { icon: undefined, iconColor: DEFAULT_LUI_COLOR, text: undefined }

export class NSPanelMessageUtils {
    public static convertToStatusItemData(
        input: unknown,
        defaultStatus: StatusItemData = DEFAULT_STATUS
    ): StatusItemData | null {
        if (input == null) return null

        // TODO: iconFont!
        const result: StatusItemData = { ...defaultStatus }

        result.text = NSPanelMessageUtils.hasProperty(input, 'text', true) ? input['text'] : null
        result.icon = NSPanelMessageUtils.hasProperty(input, 'icon', true) ? input['icon'] : null
        result.iconColor = NSPanelMessageUtils.hasProperty(input, 'iconColor')
            ? NSPanelColorUtils.toHmiColor(input['iconColor'])
            : DEFAULT_LUI_COLOR
        result.prefix = NSPanelMessageUtils.hasProperty(input, 'prefix', true) ? input['prefix'] : null
        if (NSPanelMessageUtils.hasProperty(input, 'index')) {
            const n = Number(input['index'])
            if (!Number.isNaN(n)) {
                result.index = n
            }
        }

        return result
    }

    public static convertToEntityItemData(input: any, defaultData: PageEntityData = DEFAULT_DATA): PageEntityData {
        const result: PageEntityData = { ...defaultData }

        const dEntityId: any = NSPanelMessageUtils.hasProperty(input, 'entityId', true) ? input['entityId'] : null
        const dText: any = NSPanelMessageUtils.hasProperty(input, 'text', true) ? input['text'] : null
        const dValue: any = NSPanelMessageUtils.hasProperty(input, 'value', true) ? input['value'] : null
        const dIcon: any = NSPanelMessageUtils.hasProperty(input, 'icon', true) ? input['icon'] : null
        const dIconColor: any = NSPanelMessageUtils.hasProperty(input, 'iconColor')
            ? NSPanelColorUtils.toHmiColor(input['iconColor'])
            : DEFAULT_LUI_COLOR

        result.entityId = NSPanelUtils.isString(dEntityId) ? dEntityId : null
        result.text = NSPanelUtils.isString(dText) ? dText : null
        result.value = NSPanelUtils.isString(dValue) ? dValue : null
        result.icon = NSPanelUtils.isString(dIcon) ? dIcon : null
        result.iconColor = dIconColor

        return result
    }

    public static convertToCommandData(input: object | Array<any>): CommandData | null {
        let commandResult: CommandData | null = null

        if (NSPanelMessageUtils.hasProperty(input, 'cmd')) {
            const inputParams = NSPanelMessageUtils.getPropertyOrNull(input, 'params')

            switch (input['cmd']) {
                case 'switch': {
                    const switchId = Number(NSPanelMessageUtils.getPropertyOrDefault(inputParams, 'id', -1))
                    const targetState = NSPanelMessageUtils.toBoolean(
                        NSPanelMessageUtils.getPropertyOrNull(inputParams, 'on')
                    )

                    if ((switchId === 0 || switchId === 1) && typeof targetState === 'boolean') {
                        const switchCmdParams: SwitchCommandParams = {
                            id: switchId,
                            active: targetState,
                        }
                        commandResult = { cmd: 'switch', params: switchCmdParams }
                    }
                    break
                }

                case 'toggle': {
                    const switchId = Number(NSPanelMessageUtils.getPropertyOrDefault(inputParams, 'id', -1))
                    if (switchId === 0 || switchId === 1) {
                        const switchCmdParams: SwitchCommandParams = {
                            id: switchId,
                        }
                        commandResult = { cmd: 'toggle', params: switchCmdParams }
                    }
                    break
                }

                case 'beep': {
                    const count = Number(NSPanelMessageUtils.getPropertyOrDefault(inputParams, 'count', 1))
                    const beepDuration = Number(
                        NSPanelMessageUtils.getPropertyOrDefault(inputParams, 'beepDuration', 1)
                    )
                    const silenceDuration = Number(
                        NSPanelMessageUtils.getPropertyOrDefault(inputParams, 'silenceDuration', 1)
                    )
                    const tune = Number(NSPanelMessageUtils.getPropertyOrDefault(inputParams, 'tune', NaN))
                    const buzzerCmdParams: BuzzerCommandParams = {
                        count,
                        beepDuration,
                        silenceDuration,
                    }
                    if (!Number.isNaN(tune)) {
                        buzzerCmdParams.tune = tune
                    }
                    commandResult = { cmd: 'beep', params: buzzerCmdParams }
                    break
                }

                case 'checkForUpdates': {
                    commandResult = { cmd: 'checkForUpdates' }
                    break
                }
            }
        }

        return commandResult
    }

    public static hasProperty(obj: any, propertyName: string, undefinedMeansNoProperty: boolean = false): boolean {
        if (obj === undefined || obj === null) return false

        const hasProp = propertyName in obj
        if (undefinedMeansNoProperty === false) return hasProp

        return hasProp ? obj[propertyName] !== undefined : false
    }

    public static getPropertyOrNull(obj: any, propertyName: string): any {
        return NSPanelMessageUtils.getPropertyOrDefault<any>(obj, propertyName, null)
    }

    public static getPropertyOrDefault<TResult>(obj: any, propertyName: string, defaultValue: TResult): TResult {
        const val: any =
            propertyName in obj && obj[propertyName] !== undefined
                ? obj[propertyName] // TODO: now eventually breaking out of type contraint TResult
                : defaultValue

        return val as TResult
    }

    public static toBoolean(input: any): boolean | null {
        if (typeof input === 'boolean') return input

        if (typeof input === 'string') {
            const str = input.toLowerCase()
            if (str === 'on') return true
            if (str === 'off') return false
        }

        const num = Number(input)
        if (num === 1) return true
        if (num === 0) return false

        return null
    }

    public static toDate(input: any): Date | null {
        const date = new Date(input)
        if (Number.isNaN(date.getTime()) === false) {
            return date
        }

        return null
    }
}
