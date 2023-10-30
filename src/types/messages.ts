import { ActiveCharacteristic } from './base'
import { PanelColor } from './colors'
import { EventArgs } from './events'
import { NodeMessageInFlow } from './nodered'

export interface PanelMessage extends NodeMessageInFlow {}

export type CommandTopic = 'cmd'
export type Command = 'switch' | 'toggle' | 'beep' | 'checkForUpdates'

export type CommandMessage = PanelMessage & {
    topic: CommandTopic

    payload: CommandData | CommandData[]
}

export type CommandData = {
    cmd: Command
    params?: SwitchCommandParams | BuzzerCommandParams
}

export type SwitchCommandParams = {
    id: 0 | 1
    active?: ActiveCharacteristic
}

export type BuzzerCommandParams = {
    count: number
    beepDuration?: number
    silenceDuration?: number
    tune?: number
}
// #region page input data messages
export type PageInputTopic = 'data' | 'status' | 'notify' | 'event' | 'sensor' | 'media'

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

    timeout?: number

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

export interface PageEntityDataBase {
    icon?: string
    iconColor?: PanelColor
    text?: string
}

export interface PageEntityData extends PageEntityDataBase {
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
    // used in screensaver
    prefix?: string
    iconFont?: string
    index?: 0 | 1
}
