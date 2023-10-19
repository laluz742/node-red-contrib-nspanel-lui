export const PANEL_ENTITY_TYPES = [
    'delete',
    'shutter', // popupShutter
    'light', // popupLight
    'fan', // popupFan
    'input_sel', // popupInSel
    'timer', // popupTimer
    'switch',
    'button',
    'text',
    'number',
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
}
