import { NSPanelUtils } from './nspanel-utils'
import { CommandData, PageEntityData, StatusItemData, SwitchCommandParams } from '../types'
import { DEFAULT_HMI_COLOR } from './nspanel-constants'

const DEFAULT_STATUS: StatusItemData = { icon: null, iconColor: DEFAULT_HMI_COLOR, text: null }
const DEFAULT_DATA: PageEntityData = { icon: null, iconColor: DEFAULT_HMI_COLOR, text: null }

export class NSPanelMessageUtils {
    public static convertToStatusItemData(
        input: unknown,
        defaultStatus: StatusItemData = DEFAULT_STATUS
    ): StatusItemData {
        if (input === undefined) return null

        //TODO: iconFont!
        var result: StatusItemData = Object.assign({}, defaultStatus)

        result.text = NSPanelMessageUtils.hasProperty(input, 'text', true) ? input['text'] : null
        result.icon = NSPanelMessageUtils.hasProperty(input, 'icon', true) ? input['icon'] : null
        result.iconColor = NSPanelMessageUtils.hasProperty(input, 'iconColor')
            ? NSPanelUtils.toHmiIconColor(input['iconColor'])
            : DEFAULT_HMI_COLOR
        result.prefix = NSPanelMessageUtils.hasProperty(input, 'prefix', true) ? input['prefix'] : null
        if (NSPanelMessageUtils.hasProperty(input, 'index')) {
            const n = Number(input['index'])
            if (n == 0 || n == 1) {
                result.index = n
            }
        }

        return result
    }

    public static convertToEntityItemData(input: unknown, defaultData: PageEntityData = DEFAULT_DATA): PageEntityData {
        var result: PageEntityData = Object.assign({}, defaultData)

        //TODO: intNameEntity
        result.text = NSPanelMessageUtils.hasProperty(input, 'text', true) ? input['text'] : null //TODO: could be anything else but string
        result.value = NSPanelMessageUtils.hasProperty(input, 'value', true) ? input['value'] : null //TODO: could be anything else but string
        result.icon = NSPanelMessageUtils.hasProperty(input, 'icon', true) ? input['icon'] : null //TODO: could be anything else but string
        result.iconColor = NSPanelMessageUtils.hasProperty(input, 'iconColor')
            ? NSPanelUtils.toHmiIconColor(input['iconColor'])
            : DEFAULT_HMI_COLOR

        return result
    }

    public static convertToCommandData(input: unknown): CommandData | null {
        var commandResult: CommandData | null = null

        if (NSPanelMessageUtils.hasProperty(input, 'cmd')) {
            var inputParams = NSPanelMessageUtils.getPropertyOrNull(input, 'params')

            switch (input['cmd']) {
                case 'switch':
                    var switchId = Number(NSPanelMessageUtils.getPropertyOrDefault(inputParams, 'id', -1))
                    var targetState = NSPanelMessageUtils.toBoolean(
                        NSPanelMessageUtils.getPropertyOrNull(inputParams, 'on')
                    )

                    if ((switchId == 0 || switchId == 1) && typeof targetState === 'boolean') {
                        var switchCmdParams: SwitchCommandParams = {
                            id: switchId,
                            active: targetState,
                        }
                        commandResult = { cmd: 'switch', params: switchCmdParams }
                    }
                    break
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

        var num = Number(input)
        if (num == 1) return true
        if (num == 0) return false

        return null
    }

    public static toDate(input: any): Date | null {
        var date = new Date(input)
        if (isNaN(date.getTime()) === false) {
            return date
        }

        return null
    }
}
