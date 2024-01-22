export type EventDescriptor = import('../types/types').EventDescriptor
export type EventMapping = import('../types/types').EventMapping
export type PanelEntity = import('../types/types').PanelEntity
export type INodeConfig = import('../types/types').INodeConfig
export type PageConfig = import('../types/types').PageConfig
export type PanelBasedConfig = import('../types/types').PanelBasedConfig

export type EventTypeAttrs = {
    hasId: boolean
    hasLabel: boolean
    hasIcon: boolean
    hasOptionalValue?: boolean
    isShutter?: boolean
    isNumber?: boolean
    isFan?: boolean
    isLight?: boolean
    isInputSel?: boolean
    isTimer?: boolean
    opensPopup?: boolean
    mappableToRelay?: boolean
}

export type PanelEntityListItem = PanelEntity & {
    listIndex: number
    listId: string
}

export type PanelEntityContainer = {
    entry: PanelEntityListItem
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
