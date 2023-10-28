export type ValidEventDescriptor = import('../types/types').ValidEventDescriptor
export type EventMapping = import('../types/types').EventMapping
export type PanelEntity = import('../types/types').PanelEntity
export type IPageConfig = import('../types/types').IPageConfig
export type PanelBasedConfig = import('../types/types').PanelBasedConfig

export type EventTypeAttrs = {
    hasId: boolean
    hasLabel: boolean
    hasIcon: boolean
    hasOptionalValue: boolean
    isShutter?: boolean
    isNumber?: boolean
    isFan?: boolean
    isLight?: boolean
}

export type PanelEntityContainer = {
    entry: PanelEntity
    element?: any
}

export type TypedInputParams = {
    default?: string
    types: TypedInputTypeParams[]
}

export type TypedInputTypeParams = {
    value: string
    icon?: string
    label: string
    type: string
    types?: string | string[]
    options?: any
}

export type EventMappingContainer = {
    entry: EventMapping
    element?: any
}