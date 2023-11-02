import { ActiveCharacteristic } from './base'
import { PanelColor } from './colors'
import { EventArgs } from './events'
import { NodeMessageInFlow } from './nodered'

export type PanelMessage = NodeMessageInFlow

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

export type NotifyData = {
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

export type NotifyMessage = PanelMessage & {
    topic: 'notify'

    payload?: NotifyData
}

export type PageInputMessage = PanelMessage & {
    topic: PageInputTopic | undefined

    payload?: PageEntityData | PageEntityData[] | EventArgs | StatusItemData | StatusItemData[]
}

export type PageEntityDataBase = {
    icon?: string
    iconColor?: PanelColor
    text?: string
}

export type PageEntityData = PageEntityDataBase & {
    entityId?: string
    value?: string | number
}

export type SwitchEntityData = PageEntityData & {
    active: ActiveCharacteristic
}

export type FanEntityData = SwitchEntityData & {
    speed: number
    maxSpeed: number
    mode: string
    text: string
}

export type ShutterEntityData = PageEntityData & {
    tilt?: number
}

export type InputSelectEntityData = PageEntityData & {
    mode?: string
    options?: string[]
    selectedOption: string
}

export type LightEntityData = SwitchEntityData & {
    brightness?: number
    colorTemperature?: number
    hue?: number
    saturation?: number
}

export type TimerEntityData = PageEntityData & {
    adjustable?: boolean
    timerRemainingSeconds?: number

    action1?: string
    action2?: string
    action3?: string

    label1?: string
    label2?: string
    label3?: string
}

export type ThermoEntityData = PageEntityData & {
    heading?: string
    mode?: string
    selectedOption: string
    options?: string[] | string

    heading1?: string
    mode1?: string
    selectedOption1: string
    options1?: string[] | string

    heading2?: string
    mode2?: string
    selectedOption2: string
    options2?: string[] | string
}

export type StatusItemData = PageEntityDataBase & {
    // used in screensaver
    prefix?: string
    iconFont?: string
    index?: 0 | 1
}
