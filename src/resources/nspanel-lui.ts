// #region types
type ValidEventDescriptor = import('../types/types').ValidEventDescriptor
type EventMapping = import('../types/types').EventMapping
type PanelEntity = import('../types/types').PanelEntity
type IPageConfig = import('../types/types').IPageConfig
type PanelBasedConfig = import('../types/types').PanelBasedConfig

type EventTypeAttrs = {
    hasId: boolean
    hasLabel: boolean
    hasIcon: boolean
    hasOptionalValue: boolean
    isShutter?: boolean
    isNumber?: boolean
    isFan?: boolean
    isLight?: boolean
}

type PanelEntityContainer = {
    entry: PanelEntity
    element?: any
}

type TypedInputParams = {
    default?: string
    types: TypedInputTypeParams[]
}

type TypedInputTypeParams = {
    value: string
    icon?: string
    label: string
    type: string
    types?: string | string[]
    options?: any
}

// eslint-disable-next-line vars-on-top, no-var
declare var RED

// #endregion types

var NSPanelLui = NSPanelLui || {} // eslint-disable-line

// eslint-disable-next-line func-names, @typescript-eslint/no-shadow
;(function (RED, $) {
    // #region events

    interface EventMappingContainer {
        entry: EventMapping
        element?: any
    }

    const ALL_VALID_NAVIGATION_EVENTS = [
        { event: 'nav.prev', label: 'nav.prev' },
        { event: 'nav.next', label: 'nav.next' },
    ]
    const ALL_VALID_BUTTON_EVENTS = [
        { event: 'hw.button1', label: 'hw.button1' },
        { event: 'hw.button2', label: 'hw.button2' },
    ]

    const addHardwareButtonEventsIfApplicable = (
        nsPanelId: string,
        validEventsBase: ValidEventDescriptor[]
    ): ValidEventDescriptor[] => {
        let result = validEventsBase
        const panelNode = RED.nodes.node(nsPanelId)

        if (panelNode) {
            const detachedRelays = panelNode.detachRelays ?? false
            if (detachedRelays === true) {
                result = validEventsBase.concat(NSPanelLui.Events.allButtonEvents)
            }
        }

        return result
    }

    // #endregion events

    const PANEL_ENTITY_TYPE_ATTRS: Map<string, EventTypeAttrs> = new Map<string, EventTypeAttrs>([
        ['delete', { hasId: false, hasLabel: false, hasIcon: false, hasOptionalValue: false }],
        ['shutter', { hasId: true, hasLabel: true, hasIcon: true, hasOptionalValue: false, isShutter: true }],
        ['light', { hasId: true, hasLabel: true, hasIcon: true, hasOptionalValue: false, isLight: true }],
        ['fan', { hasId: true, hasLabel: true, hasIcon: true, hasOptionalValue: false, isFan: true }],
        ['input_sel', { hasId: true, hasLabel: true, hasIcon: true, hasOptionalValue: false }],
        ['timer', { hasId: true, hasLabel: true, hasIcon: true, hasOptionalValue: false }],
        ['switch', { hasId: true, hasLabel: true, hasIcon: true, hasOptionalValue: false }],
        ['number', { hasId: true, hasLabel: true, hasIcon: true, hasOptionalValue: false, isNumber: true }],
        ['button', { hasId: true, hasLabel: true, hasIcon: true, hasOptionalValue: false }],
        ['text', { hasId: true, hasLabel: true, hasIcon: true, hasOptionalValue: false }],
        ['hvac_action', { hasId: true, hasLabel: false, hasIcon: true, hasOptionalValue: false }],
    ])

    const ALL_PANEL_ENTITY_TYPES = (() => {
        const result: string[] = Array.from(PANEL_ENTITY_TYPE_ATTRS.keys())
        return result
    })()

    const DEFAULT_COLOR = '#ffffff'

    // #region validation helpers
    // eslint-disable-next-line func-names
    const validate = (function () {
        const numberInRange = (v: any, min: number, max: number): boolean => {
            const n = Number(v)
            return Number.isNaN(n) === false && n >= min && n <= max
        }

        const limitNumberToRange = (v: any, min: number, max: number, defaultValue: number): number => {
            const n = Number(v)
            if (Number.isNaN(n)) return defaultValue === undefined ? min : defaultValue

            if (v < min) return min
            if (v > max) return max

            return v
        }
        const stringIsNotNullOrEmpty = (str: any): boolean => {
            return str !== undefined && str !== null && typeof str === 'string' ? str.trim().length > 0 : false
        }
        return {
            isNumberInRange: numberInRange,
            limitNumberToRange,
            stringIsNotNullOrEmpty,
        }
    })()
    // #endregion validation helpers

    // #region i18n and labels
    const i18n = (key: string, dict: string, group?: string) => {
        return RED._(`node-red-contrib-nspanel-lui/${dict}:${group ?? dict}.${key}`)
    }
    const normalizeLabel = (node: any) => {
        return validate.stringIsNotNullOrEmpty(node.name) ? node.name : `[${node.type}:${node.id}]`
    }
    const getNodeLabel = (node: any) => {
        const panelNode = RED.nodes.node(node.nsPanel)
        const nodeName = validate.stringIsNotNullOrEmpty(node.name)
            ? node.name
            : NSPanelLui._('defaults.name', node.type)

        const label =
            `[${panelNode?.name ?? NSPanelLui._('label.unassigned', node.type, 'common')}] ${nodeName}` || nodeName

        return label
    }
    // #endregion i18n and labels

    // #region ui generation
    // eslint-disable-next-line func-names
    const create = (function () {
        function createPageTypedInput(
            field: JQuery,
            defaultType: string,
            nodeConfig: PanelBasedConfig,
            panelAttr: string
        ) {
            const currentPanel = field.val() || nodeConfig[panelAttr]
            const typedInputParams: TypedInputParams = {
                default: defaultType || 'msg',
                types: [{ value: 'msg', label: 'msg.', type: 'msg', types: ['str'] }],
            }

            if (currentPanel !== '_ADD_' && currentPanel !== '' && currentPanel !== undefined) {
                const myId = nodeConfig.id
                const panelNode = RED.nodes.node(currentPanel)

                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                const knownPages: nodered.Node<any>[] = panelNode?.users ?? []
                const pageNodeType: TypedInputTypeParams = {
                    value: 'page',
                    icon: 'fa fa-desktop',
                    type: 'page',
                    label: 'Page',
                    options: [],
                }

                // TODO: update on panel changed
                // eslint-disable-next-line prefer-const
                for (let i in knownPages) {
                    // eslint-disable-line
                    const item = knownPages[i]
                    if (item.id !== myId && item.type.startsWith('nspanel-page')) {
                        pageNodeType.options.push({
                            value: item.id,
                            label: NSPanelLui.Editor.util.normalizeLabel(item),
                        })
                    }
                }

                typedInputParams.types.push(pageNodeType)
                typedInputParams.default = defaultType || 'page'
            }

            field.typedInput(typedInputParams)
        }

        function createPayloadTypedInput(field, defaultType = undefined) {
            return field.typedInput({
                default: defaultType || 'str',
                // ['msg', 'flow', 'global', 'str', 'num', 'bool', 'json', 'bin', 'env'],
                types: ['str', 'json'],
            })
        }

        function createLabel(parent: JQuery, text: string, width: string = '50px') {
            const label = $('<label/>', {
                style: `margin-left: 14px; vertical-align: middle; width: ${width}`, // margin-top: 7px
            }).appendTo(parent)
            $('<span/>').text(text).appendTo(label)
            return label
        }

        // #region editable event list

        const createEditableEventList = (
            node: IPageConfig,
            controlDomSelector: string,
            allValidEvents: ValidEventDescriptor[],
            initialData: EventMapping[]
        ) => {
            const allValidEventsWithHardwareButtons = NSPanelLui.Events.addHardwareButtonEventsIfApplicable(
                node.nsPanel,
                allValidEvents
            )

            let updateLock = false
            const pageEvents: {
                all: ValidEventDescriptor[]
                available: string[]
                used: string[]
            } = {
                all: allValidEventsWithHardwareButtons,
                available: [],
                used: [],
            }
            pageEvents.all.forEach((item) => pageEvents.available.push(item.event))

            const domControl = $(controlDomSelector) // TODO: if (domControl.length = 0) => not found
            const domControlList = domControl.prop('tagName') === 'ol' ? domControl : domControl.find('ol')

            if (domControlList.length === 0) return {} // TODO: if (domControl.length = 0) => not found

            function updateSelectEventFields(): void {
                if (updateLock) return

                updateLock = true
                const usedEvents: string[] = []
                const avaiableEvents: string[] = []
                const eventInputNode: any[] = []

                domControl.find('.node-input-event').each((_i, ele) => {
                    const v = $(ele).val() as string
                    if (v) usedEvents.push(v)
                    eventInputNode.push($(ele))
                })

                pageEvents.all.forEach((item) => {
                    if (!usedEvents.includes(item.event)) avaiableEvents.push(item.event)
                })

                eventInputNode.forEach((inputNode) => {
                    const usedVal = inputNode.val()
                    inputNode.empty()
                    pageEvents.all.forEach((item) => {
                        if (!usedEvents.includes(item.event) || item.event === usedVal) {
                            $('<option/>').val(item.event).text(item.label).appendTo(inputNode)
                        }
                        inputNode.val(usedVal != null ? usedVal : inputNode.children().first().val())
                    })
                })

                pageEvents.used = usedEvents
                pageEvents.available = avaiableEvents

                updateLock = false
            }

            function setAvailableEvents(allValidEventSpecs: ValidEventDescriptor[]): void {
                pageEvents.all = allValidEventSpecs.slice()
                updateSelectEventFields()
            }

            function makeControl() {
                let editableListAddButton
                function updateEditableListAddButton() {
                    const disableAdd = pageEvents.available.length === 1
                    editableListAddButton.prop('disabled', disableAdd)
                }

                domControlList.editableList({
                    addItem(container, _i, data: EventMappingContainer) {
                        updateEditableListAddButton()
                        data.element = container

                        if (!Object.prototype.hasOwnProperty.call(data, 'entry')) {
                            data.entry = { event: pageEvents.available[0], t: null, value: null }
                        }
                        const entry = data.entry
                        if (!Object.hasOwnProperty.call(entry, 'event')) {
                            entry.event = pageEvents.available[0]
                        }
                        container.css({
                            overflow: 'hidden',
                            whiteSpace: 'nowrap',
                        })

                        // #region create fragment
                        const fragment = document.createDocumentFragment()
                        const ROW1 = $('<div/>', { style: 'display: flex' }).appendTo(fragment)
                        const ROW2 = $('<div/>', { style: 'display:flex; margin-top:8px;' }).appendTo(fragment).hide()

                        const ROW1_1 = $('<div/>', { style: 'display: flex;' }).appendTo(ROW1)
                        const selectEventField = $('<select/>', {
                            class: 'node-input-event',
                            style: 'width: 120px; margin-right: 10px',
                        }).appendTo(ROW1_1)

                        const ROW1_2 = $('<div/>', { style: 'display: flex; padding-right: 10px;' }).appendTo(ROW1)
                        createLabel(ROW1_2, 'Icon:') // TODO: i18n
                        const iconField = $('<input/>', {
                            class: 'node-input-event-icon',
                            style: 'width: 10em',
                            type: 'text',
                        }).appendTo(ROW1_2)

                        const ROW1_3 = $('<div/>', { style: 'flex-grow: 1;' }).appendTo(ROW1)
                        const valueField = $('<input/>', {
                            class: 'node-input-event-value',
                            style: 'width: 100%',
                            type: 'text',
                        }).appendTo(ROW1_3)

                        const ROW2_1 = $('<div/>', { style: 'display: flex;' }).appendTo(ROW2)
                        $('<div/>', { style: 'width: 130px; padding-right: 10px; box-sizing: border-box' }).appendTo(
                            ROW2_1
                        )

                        const ROW2_2 = $('<div/>', { style: 'flex-grow: 1; margin-top: 8px' }).appendTo(ROW2)

                        const valueDataField = $('<input/>', {
                            class: 'node-input-event-data',
                            style: 'width: 100%',
                        }).appendTo(ROW2_2)

                        createPageTypedInput(valueField, entry.t, node, 'nsPanel')
                        createPayloadTypedInput(valueDataField)
                        // #endregion create fragment

                        // placeholder for following call to update event select fields
                        selectEventField.append($('<option />').val(entry.event ?? pageEvents.available[0]))

                        selectEventField.on('change', () => {
                            updateSelectEventFields()
                        })
                        valueField.on('change', (_event, type, _value) => {
                            if (type === 'msg') {
                                ROW2.show()
                            } else {
                                ROW2.hide()
                            }
                        })

                        selectEventField.val(entry.event)
                        iconField.val(entry.icon)
                        valueField.typedInput('value', entry.value)
                        valueField.typedInput('type', entry.t)

                        valueDataField.typedInput('value', entry.data)
                        valueDataField.typedInput('type', entry.dataType)

                        selectEventField.trigger('change')
                        valueDataField.trigger('change')

                        container[0].append(fragment)

                        updateSelectEventFields()
                    },

                    removeItem(_listItem) {
                        updateSelectEventFields()
                        updateEditableListAddButton()
                    },

                    sortItems(_events) {},

                    sortable: true,
                    removable: true,
                })
                editableListAddButton = (
                    domControl.prop('tagName') === 'ol' ? domControl.closest('.red-ui-editableList') : domControl
                ).find('.red-ui-editableList-addButton')
            }

            function addItems(items) {
                if (items !== undefined && Array.isArray(items)) {
                    items.forEach((item) => {
                        domControlList.editableList('addItem', { entry: item })
                    })
                }
                updateSelectEventFields()
            }

            function empty() {
                domControlList.editableList('empty')
            }

            function getEvents() {
                const events: EventMapping[] = []
                const eventItems = domControlList.editableList('items')

                eventItems.each((_i, ele) => {
                    const listItem = $(ele)
                    const eventName = listItem?.find('select')?.val()?.toString() ?? ''
                    const icon = listItem?.find('.node-input-event-icon')?.val()?.toString() ?? ''
                    const entryT = listItem.find('.node-input-event-value').typedInput('type').toString()
                    const entryValue = listItem.find('.node-input-event-value').typedInput('value').toString()

                    const entry: EventMapping = { event: eventName, t: entryT, value: entryValue, icon }

                    if (entry.t === 'msg') {
                        entry.data = listItem.find('.node-input-event-data').typedInput('value')
                        entry.dataType = listItem.find('.node-input-event-data').typedInput('type')
                    }
                    events.push(entry)
                })

                return events
            }

            makeControl()
            addItems(initialData)

            return {
                setPanel: (_panel) => {}, // TODO: update on panel changed
                addItems: (items) => addItems(items),
                empty: () => empty(),
                getEvents: () => getEvents(),
                setAvailableEvents: (allValidEventSpecs: ValidEventDescriptor[]) =>
                    setAvailableEvents(allValidEventSpecs),
            }
        }
        // #endregion editable event list

        // #region editable entity list
        const createEditableEntitiesList = (
            _node: IPageConfig,
            controlDomSelector: string,
            maxEntities: number,
            initialData: PanelEntity[],
            validEntities: string[] = ALL_PANEL_ENTITY_TYPES
        ) => {
            const domControl = $(controlDomSelector) // TODO: if (domControl.length = 0) => not found
            const domControlList = domControl.prop('tagName') === 'ol' ? domControl : domControl.find('ol')

            if (domControlList.length === 0) return null

            function makeControl() {
                let editableListAddButton
                let count: number = 0

                const updateListAddButton = () => {
                    editableListAddButton.prop('disabled', count >= maxEntities)
                }

                domControlList.editableList({
                    addItem(container, _i, data: PanelEntityContainer) {
                        count += 1
                        updateListAddButton()

                        data.element = container

                        if (!Object.prototype.hasOwnProperty.call(data, 'entry')) {
                            data.entry = { type: 'delete', entityId: '', iconColor: DEFAULT_COLOR }
                        }
                        const entry = data.entry
                        if (!Object.prototype.hasOwnProperty.call(entry, 'type')) {
                            entry.type = 'delete' // TODO: 'delete' might not be a valid entity type
                        }
                        container.css({
                            overflow: 'hidden',
                            whiteSpace: 'nowrap',
                        })

                        // #region create fragment
                        // TODO use template instead of code
                        const fragment = document.createDocumentFragment()
                        const ROW1 = $('<div/>', { style: 'display: flex' }).appendTo(fragment)
                        const rowOptionalValue = $('<div/>', { style: 'display: flex; margin-top:8px;' }).appendTo(
                            fragment
                        )
                        const rowIcon = $('<div/>', { style: 'display: flex; margin-top:8px;' })
                            .appendTo(fragment)
                            .hide()
                        const rowShutter = $('<div/>', { style: 'display: flex; margin-top:8px;' })
                            .appendTo(fragment)
                            .hide()
                        const rowShutterTiltIcons = $('<div/>', { style: 'display: flex; margin-top:8px;' })
                            .appendTo(fragment)
                            .hide()
                        const rowNumber = $('<div/>', { style: 'display: flex; margin-top:8px;' })
                            .appendTo(fragment)
                            .hide()
                        const rowFanModes = $('<div/>', { style: 'display: flex; margin-top:8px;' })
                            .appendTo(fragment)
                            .hide()
                        const rowLight = $('<div/>', { style: 'display: flex; margin-top:8px;' })
                            .appendTo(fragment)
                            .hide()

                        // #region row1
                        const ROW1_1 = $('<div/>').appendTo(ROW1)
                        const selectTypeField = $('<select/>', {
                            class: 'node-input-entity-type',
                            style: 'min-width: 120px; width:120px; margin-right: 10px',
                        }).appendTo(ROW1_1)
                        validEntities.forEach((item) => {
                            const label = i18n(`label.${item}`, 'nspanel-panel', 'common')
                            $('<option/>').val(item).text(label).appendTo(selectTypeField)
                        })

                        const ROW1_2 = $('<div/>', { style: 'flex-grow: 1;' }).appendTo(ROW1)
                        createLabel(ROW1_2, 'Id:') // TODO: i18n
                        const entityIdField = $('<input/>', {
                            class: 'node-input-entity-id',
                            style: 'width: 10em',
                            type: 'text',
                        }).appendTo(ROW1_2)

                        const ROW1_3 = $('<div/>', { style: 'flex-grow: 1;' }).appendTo(ROW1)
                        createLabel(ROW1_3, 'Label:') // TODO: i18n
                        const entityTextField = $('<input/>', {
                            class: 'node-input-entity-text',
                            style: 'width: 10em',
                            type: 'text',
                        }).appendTo(ROW1_3)

                        // #endregion row1

                        // #region rowOptionalValue
                        const rowOptionalValue1 = $('<div/>').appendTo(rowOptionalValue)
                        $('<div/>', { style: 'width: 42px; padding-right: 10px; box-sizing: border-box' }).appendTo(
                            rowOptionalValue1
                        )
                        const rowOptionalValue2 = $('<div/>', { style: 'flex-grow: 1;' }).appendTo(rowOptionalValue)
                        createLabel(rowOptionalValue2, 'Text:') // TODO: i18n
                        const optionalValueField = $('<input/>', {
                            class: 'node-input-entity-optionalvalue',
                            style: 'width: 10em',
                            type: 'text',
                        }).appendTo(rowOptionalValue2)
                        // #endregion row2

                        // #region rowIcon
                        const rowIcon1 = $('<div/>').appendTo(rowIcon)
                        $('<div/>', { style: 'width: 42px; padding-right: 10px; box-sizing: border-box' }).appendTo(
                            rowIcon1
                        )

                        const rowIcon2 = $('<div/>', { style: 'flex-grow: 1;' }).appendTo(rowIcon)

                        createLabel(rowIcon2, 'Icon:') // TODO: i18n
                        const entityIconField = $('<input/>', {
                            class: 'node-input-entity-icon',
                            style: 'width: 10em',
                            type: 'text',
                        }).appendTo(rowIcon2)

                        createLabel(rowIcon2, 'Farbe:') // TODO: i18n
                        const entityIconColorField = $('<input/>', {
                            class: 'node-input-entity-iconcolor',
                            style: 'width: 42px',
                            type: 'color',
                        }).appendTo(rowIcon2)
                        // #endregion rowIcon

                        // #region rowShutter
                        const rowShutter1 = $('<div/>').appendTo(rowShutter)
                        $('<div/>', { style: 'width: 42px; padding-right: 10px; box-sizing: border-box' }).appendTo(
                            rowShutter1
                        )

                        const rowShutter2 = $('<div/>', { style: 'flex-grow: 1;' }).appendTo(rowShutter)

                        // TODO: Label "Icons:"
                        createLabel(rowShutter2, 'Ab') // TODO: i18n
                        const iconDownField = $('<input/>', {
                            class: 'node-input-entity-shutter-icondown',
                            style: 'width: 6em',
                            type: 'text',
                        }).appendTo(rowShutter2)

                        createLabel(rowShutter2, 'Stop') // TODO: i18n
                        const iconStopField = $('<input/>', {
                            class: 'node-input-entity-shutter-iconstop',
                            style: 'width: 6em',
                            type: 'text',
                        }).appendTo(rowShutter2)

                        createLabel(rowShutter2, 'Auf') // TODO: i18n
                        const iconUpField = $('<input/>', {
                            class: 'node-input-entity-shutter-iconup',
                            style: 'width: 6em',
                            type: 'text',
                        }).appendTo(rowShutter2)
                        // #endregion rowShutter

                        // #region rowShutterTiltIcons
                        const rowShutterTiltIcons1 = $('<div/>').appendTo(rowShutterTiltIcons)
                        $('<div/>', { style: 'width: 42px; padding-right: 10px; box-sizing: border-box' }).appendTo(
                            rowShutterTiltIcons1
                        )
                        // TODO: input has tilt
                        const rowShutterTiltIcons2 = $('<div/>', { style: 'flex-grow: 1;' }).appendTo(
                            rowShutterTiltIcons
                        )

                        // TODO: Label "TILT"
                        createLabel(rowShutterTiltIcons2, 'Tilt') // TODO: i18n
                        const hasTiltField = $('<input/>', {
                            class: 'node-input-entity-shutter-hastilt',
                            style: 'width: 1em',
                            type: 'checkbox',
                        }).appendTo(rowShutterTiltIcons2)

                        createLabel(rowShutterTiltIcons2, 'Links') // TODO: i18n
                        const iconTiltLeftField = $('<input/>', {
                            class: 'node-input-entity-shutter-icontiltleft',
                            style: 'width: 6em',
                            type: 'text',
                        }).appendTo(rowShutterTiltIcons2)

                        createLabel(rowShutterTiltIcons2, 'Stopp') // TODO: i18n
                        const iconTiltStopField = $('<input/>', {
                            class: 'node-input-entity-shutter-icontiltstop',
                            style: 'width: 6em',
                            type: 'text',
                        }).appendTo(rowShutterTiltIcons2)

                        createLabel(rowShutterTiltIcons2, 'Rechts') // TODO: i18n
                        const iconTiltRightField = $('<input/>', {
                            class: 'node-input-entity-shutter-icontiltright',
                            style: 'width: 6em',
                            type: 'text',
                        }).appendTo(rowShutterTiltIcons2)
                        // #endregion rowShutterTiltIcons

                        // #region rowNumber
                        const rowNumber1 = $('<div/>').appendTo(rowNumber)
                        $('<div/>', { style: 'width: 42px; padding-right: 10px; box-sizing: border-box' }).appendTo(
                            rowNumber1
                        )
                        const rowNumber2 = $('<div/>', { style: 'flex-grow: 1;' }).appendTo(rowNumber)
                        createLabel(rowNumber2, 'Min:') // TODO: i18n
                        const numberMinField = $('<input/>', {
                            class: 'node-input-entity-num-min',
                            style: 'width: 10em',
                            type: 'number',
                        }).appendTo(rowNumber2)

                        createLabel(rowNumber2, 'Max:') // TODO: i18n
                        const numberMaxField = $('<input />', {
                            class: 'node-input-entity-num-max',
                            style: 'width: 10em',
                            type: 'number',
                        }).appendTo(rowNumber2)
                        // #endregion rowNumber

                        // #region rowFanModes
                        const rowFan1 = $('<div/>').appendTo(rowFanModes)
                        $('<div/>', { style: 'width: 42px; padding-right: 10px; box-sizing: border-box' }).appendTo(
                            rowFan1
                        )

                        const rowFan2 = $('<div/>', { style: 'flex-grow: 1;' }).appendTo(rowFanModes)

                        // TODO: Label "Icons:"
                        createLabel(rowFan2, 'Modus 1:') // TODO: i18n
                        const fanMode1Field = $('<input/>', {
                            class: 'node-input-entity-fan-mode1',
                            style: 'width: 6em',
                            type: 'text',
                        }).appendTo(rowFan2)

                        createLabel(rowFan2, 'Modus 2:') // TODO: i18n
                        const fanMode2Field = $('<input/>', {
                            class: 'node-input-entity-fan-mode2',
                            style: 'width: 6em',
                            type: 'text',
                        }).appendTo(rowFan2)

                        createLabel(rowFan2, 'Modus 3:') // TODO: i18n
                        const fanMode3Field = $('<input/>', {
                            class: 'node-input-entity-fan-mode3',
                            style: 'width: 6em',
                            type: 'text',
                        }).appendTo(rowFan2)
                        // #endregion rowFanModes

                        // #region rowLight
                        const rowLight1 = $('<div/>').appendTo(rowLight)
                        $('<div/>', { style: 'width: 42px; padding-right: 10px; box-sizing: border-box' }).appendTo(
                            rowLight1
                        )
                        const rowLight2 = $('<div/>', { style: 'flex-grow: 1;' }).appendTo(rowLight)

                        createLabel(rowLight2, 'dimmbar:') // TODO: i18n
                        const lightDimmableField = $('<input/>', {
                            class: 'node-input-entity-light-dimmable',
                            style: 'width: 6em',
                            type: 'checkbox',
                        }).appendTo(rowLight2)

                        createLabel(rowLight2, 'Temperatur:') // TODO: i18n
                        const lightColorTemperatureField = $('<input/>', {
                            class: 'node-input-entity-light-colorTemperature',
                            style: 'width: 6em',
                            type: 'checkbox',
                        }).appendTo(rowLight2)

                        createLabel(rowLight2, 'Farbe:') // TODO: i18n
                        const lightColorField = $('<input/>', {
                            class: 'node-input-entity-light-color',
                            style: 'width: 6em',
                            type: 'checkbox',
                        }).appendTo(rowLight2)

                        // #endregion rowLight
                        // #endregion create fragment

                        selectTypeField.on('change', () => {
                            const val = `${selectTypeField.val()}`
                            const entityTypeAttrs = PANEL_ENTITY_TYPE_ATTRS.get(val)
                            if (entityTypeAttrs !== undefined) {
                                ROW1_2.toggle(entityTypeAttrs.hasId)
                                ROW1_3.toggle(entityTypeAttrs.hasLabel)
                                rowOptionalValue.toggle(entityTypeAttrs.hasOptionalValue ?? false)
                                rowIcon.toggle(entityTypeAttrs.hasIcon ?? false)
                                rowShutter.toggle(entityTypeAttrs.isShutter ?? false)
                                rowShutterTiltIcons.toggle(entityTypeAttrs.isShutter ?? false)
                                rowNumber.toggle((entityTypeAttrs.isNumber || entityTypeAttrs.isFan) ?? false)
                                rowFanModes.toggle(entityTypeAttrs.isFan ?? false)
                                rowLight.toggle(entityTypeAttrs.isLight ?? false)

                                // fan min/max number handling
                                if (entityTypeAttrs.isFan) {
                                    numberMinField.val(0)
                                }
                                numberMinField.prop('disabled', entityTypeAttrs.isFan)
                            }
                        })

                        entityIdField.val(entry.entityId)
                        entityIconField.val(entry.icon ?? '')
                        entityIconColorField.val(entry.iconColor ?? '')
                        entityTextField.val(entry.text)
                        optionalValueField.val(entry.optionalValue ?? '')

                        // shutter
                        iconDownField.val(entry.iconDown ?? '')
                        iconUpField.val(entry.iconUp ?? '')
                        iconStopField.val(entry.iconStop ?? '')
                        iconTiltLeftField.val(entry.iconTiltLeft ?? '')
                        iconTiltStopField.val(entry.iconTiltStop ?? '')
                        iconTiltRightField.val(entry.iconTiltRight ?? '')

                        hasTiltField.on('change', () => {
                            iconTiltLeftField.prop('disabled', entry.hasTilt ?? false)
                            iconTiltStopField.prop('disabled', entry.hasTilt ?? false)
                            iconTiltRightField.prop('disabled', entry.hasTilt ?? false)
                        })
                        hasTiltField.prop('checked', entry.hasTilt ?? false)

                        // number
                        numberMinField.val(entry.min ?? '')
                        numberMaxField.val(entry.max ?? '')

                        // fan
                        fanMode1Field.val(entry.fanMode1 ?? '')
                        fanMode2Field.val(entry.fanMode2 ?? '')
                        fanMode3Field.val(entry.fanMode3 ?? '')

                        // light
                        lightDimmableField.prop('checked', entry.dimmable ?? false)
                        lightColorTemperatureField.prop('checked', entry.hasColorTemperature ?? false)
                        lightColorField.prop('checked', entry.hasColor ?? false)

                        selectTypeField.val(entry.type)
                        selectTypeField.trigger('change')

                        container[0].append(fragment)
                    },

                    removeItem(_listItem) {
                        count -= 1
                        updateListAddButton()
                    },

                    sortItems(_events) {},

                    sortable: true,
                    removable: true,
                })
                editableListAddButton = (
                    domControl.prop('tagName') === 'ol' ? domControl.closest('.red-ui-editableList') : domControl
                ).find('.red-ui-editableList-addButton')
            }

            function addItems(items) {
                if (items !== undefined && Array.isArray(items)) {
                    items.forEach((item) => {
                        domControlList.editableList('addItem', { entry: item })
                    })
                }
            }

            function empty() {
                domControlList.editableList('empty')
            }

            function getEntities() {
                const entities: PanelEntity[] = []
                const entityItems = domControlList.editableList('items')

                entityItems.each((_i, ele) => {
                    let maxStr: string
                    let minStr: string
                    const listItem = $(ele)

                    const type = listItem.find('.node-input-entity-type').val().toString()
                    const id = listItem.find('.node-input-entity-id').val().toString()
                    const text = listItem.find('.node-input-entity-text').val().toString()
                    const optionalValue = listItem.find('.node-input-entity-optionalvalue').val().toString()
                    const icon = listItem.find('.node-input-entity-icon').val().toString()
                    const iconColor = listItem.find('.node-input-entity-iconcolor').val().toString()
                    const entity: PanelEntity = {
                        type,
                        entityId: id,
                        text,
                        icon,
                        iconColor,
                    }

                    if (validate.stringIsNotNullOrEmpty(optionalValue)) {
                        entity.optionalValue = optionalValue
                    }

                    switch (type) {
                        case 'shutter': {
                            const iconDown = listItem.find('.node-input-entity-shutter-icondown').val().toString()
                            const iconUp = listItem.find('.node-input-entity-shutter-iconup').val().toString()
                            const iconStop = listItem.find('.node-input-entity-shutter-iconstop').val().toString()
                            const hasTilt = listItem.find('.node-input-entity-shutter-hastilt').is(':checked')

                            const iconTiltLeft = listItem
                                .find('.node-input-entity-shutter-icontiltleft')
                                .val()
                                .toString()
                            const iconTiltStop = listItem
                                .find('.node-input-entity-shutter-icontiltstop')
                                .val()
                                .toString()
                            const iconTiltRight = listItem
                                .find('.node-input-entity-shutter-icontiltright')
                                .val()
                                .toString()

                            if (validate.stringIsNotNullOrEmpty(iconDown)) {
                                entity.iconDown = iconDown
                            }
                            if (validate.stringIsNotNullOrEmpty(iconUp)) {
                                entity.iconUp = iconUp
                            }
                            if (validate.stringIsNotNullOrEmpty(iconStop)) {
                                entity.iconStop = iconStop
                            }

                            entity.hasTilt = hasTilt
                            if (validate.stringIsNotNullOrEmpty(iconTiltLeft)) {
                                entity.iconTiltLeft = iconTiltLeft
                            }

                            if (validate.stringIsNotNullOrEmpty(iconTiltStop)) {
                                entity.iconTiltStop = iconTiltStop
                            }

                            if (validate.stringIsNotNullOrEmpty(iconTiltRight)) {
                                entity.iconTiltRight = iconTiltRight
                            }

                            break
                        }

                        case 'number': {
                            minStr = listItem.find('.node-input-entity-num-min').val().toString()
                            maxStr = listItem.find('.node-input-entity-num-max').val().toString()
                            const numberMin = Number(minStr)
                            const numberMax = Number(maxStr)

                            if (!Number.isNaN(numberMin)) {
                                entity.min = numberMin
                            }
                            if (!Number.isNaN(numberMax)) {
                                entity.max = numberMax
                            }
                            break
                        }

                        case 'fan': {
                            const fanMode1 = listItem.find('.node-input-entity-fan-mode1').val().toString()
                            const fanMode2 = listItem.find('.node-input-entity-fan-mode2').val().toString()
                            const fanMode3 = listItem.find('.node-input-entity-fan-mode3').val().toString()
                            maxStr = listItem.find('.node-input-entity-num-max').val().toString()
                            const max = Number(maxStr)

                            if (!Number.isNaN(max)) {
                                entity.max = max
                            }

                            entity.fanMode1 = fanMode1
                            entity.fanMode2 = fanMode2
                            entity.fanMode3 = fanMode3
                            entity.min = 0
                            break
                        }
                        case 'light': {
                            const dimmable: boolean = listItem.find('.node-input-entity-light-dimmable').is(':checked')
                            const hasColorTemperature = listItem
                                .find('.node-input-entity-light-colorTemperature')
                                .is(':checked')
                            const hasColor = listItem.find('.node-input-entity-light-color').is(':checked')

                            entity.dimmable = dimmable
                            entity.hasColorTemperature = hasColorTemperature
                            entity.hasColor = hasColor
                            break
                        }
                    }

                    entities.push(entity)
                })
                return entities
            }

            makeControl()
            addItems(initialData)

            return {
                addItems: (items) => addItems(items),
                empty: () => empty(),
                getEntities: () => getEntities(),
            }
        }
        // #endregion editable entity list

        return {
            editableEntitiesList: createEditableEntitiesList,
            editableEventList: createEditableEventList,
            pageTypedInput: createPageTypedInput,
            payloadTypedInput: createPayloadTypedInput,
        }
    })()
    // #endregion ui generation

    // #region API generation
    NSPanelLui['_'] = i18n

    NSPanelLui.Editor = NSPanelLui.Editor || {
        _: i18n,
        validate,
        create,
        util: {
            normalizeLabel,
            getNodeLabel,
        },
    }
    NSPanelLui.Events = NSPanelLui.Events || {
        allNavigationEvents: ALL_VALID_NAVIGATION_EVENTS,
        allButtonEvents: ALL_VALID_BUTTON_EVENTS,
        addHardwareButtonEventsIfApplicable,
    }
    // #endregion API generation
})(RED, $)
