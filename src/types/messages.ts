import { NodeMessageInFlow, NodeMessageParts } from 'node-red'
import { PanelColor } from './entities'
import { EventArgs } from './events'

export interface PanelMessage extends NodeMessageInFlow {}

export type CommandTopic = 'cmd'
export type Command = 'switch' | 'checkForUpdates'
export type ActiveCharacteristic = boolean | 0 | 1 | '0' | '1'

export interface CommandMessage extends PanelMessage {
    topic: CommandTopic

    payload: CommandData | CommandData[]
}

export interface CommandData {
    cmd: Command
    params?: SwitchCommandParams
}

export interface SwitchCommandParams {
    id: 0 | 1
    active?: ActiveCharacteristic
}

// #region page input data messages
export interface PageInputMessageParts extends NodeMessageParts {}

export type PageInputTopic = 'data' | 'status' | 'notify' | 'event' | 'sensor'

export interface NotifyData {
    notifyId?: string

    heading?: string
    headingColor?: PanelColor

    cancelText?: string
    cancelColor?: PanelColor
    okText?: string
    okColor?: PanelColor

    text?: string
    textColor?: PanelColor
    fontSize?: number

    timeout?: Number

    icon?: string
    iconColor?: PanelColor

    beep?: ActiveCharacteristic
}

export interface NotifyMessage extends PanelMessage {
    topic: 'notify'

    payload?: NotifyData
}

export interface PageInputMessage extends PanelMessage {
    topic: PageInputTopic | undefined

    payload?: PageEntityData | PageEntityData[] | EventArgs | StatusItemData | StatusItemData[]
}

export interface PageOutputMessage extends PanelMessage {
    //FIXME:
}

export interface PageEntityDataBase {
    icon?: string
    iconColor?: PanelColor
    text?: string
}

export interface PageEntityData extends PageEntityDataBase {
    //FIXME data processing should be resolved in a way the  internals below are not used externally
    entityId?: string
    value?: string | number
}

export interface SwitchEntityData extends PageEntityData {
    active: ActiveCharacteristic
}

export interface FanEntityData extends SwitchEntityData {
    speed: number
    maxSpeed: number
    mode: string
    text: string
}

export interface ShutterEntityData extends PageEntityData {
    tilt?: number
}

export interface LightEntityData extends SwitchEntityData {
    brightness?: number
    colorTemperature?: number
    hue?: number
    saturation?: number
}

export interface StatusItemData extends PageEntityDataBase {
    //used in screensaver
    prefix?: string
    iconFont?: string
    index?: 0 | 1
}
