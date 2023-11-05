import * as NSPanelConstants from '../lib/nspanel-constants'

export const PANEL_ENTITY_TYPES = [
    NSPanelConstants.STR_LUI_ENTITY_NONE,
    NSPanelConstants.STR_LUI_ENTITY_SHUTTER, // popupShutter
    NSPanelConstants.STR_LUI_ENTITY_LIGHT, // popupLight
    NSPanelConstants.STR_LUI_ENTITY_FAN, // popupFan
    NSPanelConstants.STR_LUI_ENTITY_INPUTSEL, // popupInSel
    NSPanelConstants.STR_LUI_ENTITY_TIMER, // popupTimer
    NSPanelConstants.STR_LUI_ENTITY_SWITCH,
    NSPanelConstants.STR_LUI_ENTITY_BUTTON,
    NSPanelConstants.STR_LUI_ENTITY_TEXT,
    NSPanelConstants.STR_LUI_ENTITY_NUMBER,
] as const

export type PanelEntityType = typeof PANEL_ENTITY_TYPES

export type PanelEntity = {
    type: string
    text?: string
    icon?: string
    iconColor?: string
    entityId: string
    optionalValue?: string | number

    // number
    min?: number
    max?: number

    // shutter
    iconUp?: string
    iconDown?: string
    iconStop?: string
    hasTilt?: boolean
    iconTiltLeft?: string
    iconTiltStop?: string
    iconTiltRight?: string

    // fan
    fanMode1?: string
    fanMode2?: string
    fanMode3?: string

    // light
    dimmable?: boolean
    hasColorTemperature?: boolean
    hasColor?: boolean

    // input select
    inputSelType?: string

    // timer
    adjustable?: boolean
    timer?: number
    action1?: string
    action2?: string
    action3?: string

    label1?: string
    label2?: string
    label3?: string
}
