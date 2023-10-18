// #region types
type ValidEventSpec = import('../types/types').ValidEventSpec
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

type typedInputParams = {
    default?: string
    types: typedInputTypeParams[]
}

type typedInputTypeParams = {
    value: string
    icon?: string
    label: string
    type: string
    types?: string | string[]
    options?: any
}

declare var RED

// #endregion types

var NSPanelLui = NSPanelLui || {}

;(function (RED, $) {
    // #region events

    interface EventMappingContainer {
        entry: EventMapping
        element?: any
    }

    const _allValidNavigationEvents = [
        { event: 'nav.prev', label: 'nav.prev' },
        { event: 'nav.next', label: 'nav.next' },
    ]
    const _allValidButtonEvents = [
        { event: 'hw.button1', label: 'hw.button1' },
        { event: 'hw.button2', label: 'hw.button2' },
    ]

    const _addHardwareButtonEventsIfApplicable = (
        nsPanelId: string,
        validEventsBase: ValidEventSpec[]
    ): ValidEventSpec[] => {
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

    const ALL_PANEL_ENTITY_TYPES = (function () {
        const result: string[] = Array.from(PANEL_ENTITY_TYPE_ATTRS.keys())
        return result
    })()

    const DEFAULT_COLOR = '#ffffff'

    // #region i18n and labels
    const _i18n = (key: string, dict: string, group?: string) => {
        return RED._(`node-red-contrib-nspanel-lui/${dict}:${group ?? dict}.${key}`)
    }
    const _normalizeLabel = function (node: any) {
        return _validate.stringIsNotNullOrEmpty(node.name) ? node.name : '[' + node.type + ':' + node.id + ']'
    }
    const _getNodeLabel = function (node: any) {
        const panelNode = RED.nodes.node(node.nsPanel)

        const label =
            '[' + (panelNode?.name ?? NSPanelLui._('label.unassigned', node.type, 'common')) + '] ' + node.name ||
            NSPanelLui._('defaults.name', node.type)

        return label
    }
    // #endregion i18n and labels

    // #region validation helpers
    const _validate = (function () {
        const _numberInRange = (v: any, min: number, max: number): boolean => {
            const n = Number(v)
            return Number.isNaN(n) === false && n >= min && n <= max
        }

        const _limitNumberToRange = (v: any, min: number, max: number, defaultValue: number): number => {
            const n = Number(v)
            if (Number.isNaN(n)) return defaultValue === undefined ? min : defaultValue

            if (v < min) return min
            if (v > max) return max

            return v
        }
        const _stringIsNotNullOrEmpty = (str: any): boolean => {
            return str !== undefined && str !== null && typeof str === 'string' ? str.trim().length > 0 : false
        }
        return {
            isNumberInRange: _numberInRange,
            limitNumberToRange: _limitNumberToRange,
            stringIsNotNullOrEmpty: _stringIsNotNullOrEmpty,
        }
    })()
    // #endregion validation helpers

    // #region ui generation
    const _create = (function () {
        function _createPageTypedInput(
            field: JQuery,
            defaultType: string,
            nodeConfig: PanelBasedConfig,
            panelAttr: string
        ) {
            const currentPanel = field.val() || nodeConfig[panelAttr]
            const typedInputParams: typedInputParams = {
                default: defaultType || 'msg',
                types: [{ value: 'msg', label: 'msg.', type: 'msg', types: ['str'] }],
            }

            if (currentPanel !== '_ADD_' && currentPanel !== '' && currentPanel !== undefined) {
                const myId = nodeConfig.id
                const panelNode = RED.nodes.node(currentPanel)

                // @ts-ignore
                const knownPages: nodered.Node<any>[] = panelNode?.users ?? []
                const pageNodeType: typedInputTypeParams = {
                    value: 'page',
                    icon: 'fa fa-desktop',
                    type: 'page',
                    label: 'Page',
                    options: [],
                }

                // FIXME: update on panel changed
                for (let i in knownPages) {
                    const item = knownPages[i]
                    if (item.id !== myId && item.type.startsWith('nspanel-page')) {
                        pageNodeType.options.push({
                            value: item.id,
                            label: NSPanelLui.Editor.normalizeLabel(item),
                        })
                    }
                }

                typedInputParams.types.push(pageNodeType)
                typedInputParams.default = defaultType || 'page'
            }

            field.typedInput(typedInputParams)
        }

        function _createPayloadTypedInput(field, defaultType = undefined) {
            return field.typedInput({
                default: defaultType || 'str',
                // ['msg', 'flow', 'global', 'str', 'num', 'bool', 'json', 'bin', 'env'],
                types: ['str', 'json'],
            })
        }

        function _createLabel(parent: JQuery, text: string, width: string = '50px') {
            const label = $('<label/>', {
                style: 'margin-left: 14px; vertical-align: middle; width: ' + width, // margin-top: 7px
            }).appendTo(parent)
            $('<span/>').text(text).appendTo(label)
            return label
        }

        // #region editable event list

        const _createEditableEventList = function (
            node: IPageConfig,
            controlDomSelector: string,
            allValidEvents: ValidEventSpec[],
            initialData: EventMapping[]
        ) {
            const allValidEventsWithHardwareButtons = NSPanelLui.Events.addHardwareButtonEventsIfApplicable(
                node.nsPanel,
                allValidEvents
            )

            let updateLock = false
            const pageEvents: {
                all: ValidEventSpec[]
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

            function _updateSelectEventFields(): void {
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

            function _setAvailableEvents(allValidEventSpecs: ValidEventSpec[]): void {
                pageEvents.all = allValidEventSpecs.slice()
                _updateSelectEventFields()
            }

            function _makeControl() {
                let editableListAddButton
                function _updateEditableListAddButton() {
                    const disableAdd = pageEvents.available.length === 1
                    editableListAddButton.prop('disabled', disableAdd)
                }

                domControlList.editableList({
                    addItem(container, _i, data: EventMappingContainer) {
                        _updateEditableListAddButton()
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
                        const row1 = $('<div/>', { style: 'display: flex' }).appendTo(fragment)
                        const row2 = $('<div/>', { style: 'display:flex; margin-top:8px;' }).appendTo(fragment).hide()

                        const row1_1 = $('<div/>', { style: 'display: flex;' }).appendTo(row1)
                        const selectEventField = $('<select/>', {
                            class: 'node-input-event',
                            style: 'width: 120px; margin-right: 10px',
                        }).appendTo(row1_1)

                        const row1_2 = $('<div/>', { style: 'display: flex; padding-right: 10px;' }).appendTo(row1)
                        _createLabel(row1_2, 'Icon:') // TODO: i18n
                        const iconField = $('<input/>', {
                            class: 'node-input-event-icon',
                            style: 'width: 10em',
                            type: 'text',
                        }).appendTo(row1_2)

                        const row1_3 = $('<div/>', { style: 'flex-grow: 1;' }).appendTo(row1)
                        const valueField = $('<input/>', {
                            class: 'node-input-event-value',
                            style: 'width: 100%',
                            type: 'text',
                        }).appendTo(row1_3)

                        const row2_1 = $('<div/>', { style: 'display: flex;' }).appendTo(row2)
                        $('<div/>', { style: 'width: 130px; padding-right: 10px; box-sizing: border-box' }).appendTo(
                            row2_1
                        )

                        const row2_2 = $('<div/>', { style: 'flex-grow: 1; margin-top: 8px' }).appendTo(row2)

                        const valueDataField = $('<input/>', {
                            class: 'node-input-event-data',
                            style: 'width: 100%',
                        }).appendTo(row2_2)

                        _createPageTypedInput(valueField, entry.t, node, 'nsPanel')
                        _createPayloadTypedInput(valueDataField)
                        // #endregion create fragment

                        // placeholder for following call to update event select fields
                        selectEventField.append($('<option />').val(entry.event ?? pageEvents.available[0]))

                        selectEventField.on('change', () => {
                            _updateSelectEventFields()
                        })
                        valueField.on('change', (_event, type, _value) => {
                            if (type === 'msg') {
                                row2.show()
                            } else {
                                row2.hide()
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

                        _updateSelectEventFields()
                    },

                    removeItem(_listItem) {
                        _updateSelectEventFields()
                        _updateEditableListAddButton()
                    },

                    sortItems(_events) {},

                    sortable: true,
                    removable: true,
                })
                editableListAddButton = (
                    domControl.prop('tagName') === 'ol' ? domControl.closest('.red-ui-editableList') : domControl
                ).find('.red-ui-editableList-addButton')
            }

            function _addItems(items) {
                if (items !== undefined && Array.isArray(items)) {
                    items.forEach((item) => {
                        domControlList.editableList('addItem', { entry: item })
                    })
                }
                _updateSelectEventFields()
            }

            function _empty() {
                domControlList.editableList('empty')
            }

            function _getEvents() {
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

            _makeControl()
            _addItems(initialData)

            return {
                setPanel: (_panel) => {}, // FIXME: update on panel changed
                addItems: (items) => _addItems(items),
                empty: () => _empty(),
                getEvents: () => _getEvents(),
                setAvailableEvents: (allValidEventSpecs: ValidEventSpec[]) => _setAvailableEvents(allValidEventSpecs),
            }
        }
        // #endregion editable event list

        // #region editable entity list
        const _createEditableEntitiesList = function (
            _node: IPageConfig,
            controlDomSelector: string,
            maxEntities: number,
            initialData: PanelEntity[],
            validEntities: string[] = ALL_PANEL_ENTITY_TYPES
        ) {
            const _api = {
                addItems: (items) => _addItems(items),
                empty: () => _empty(),
                getEntities: () => _getEntities(),
            }

            const domControl = $(controlDomSelector) // TODO: if (domControl.length = 0) => not found
            const domControlList = domControl.prop('tagName') === 'ol' ? domControl : domControl.find('ol')

            if (domControlList.length === 0) return _api // TODO: if (domControl.length = 0) => not found

            function _makeControl() {
                let editableListAddButton
                let count: number = 0
                domControlList.editableList({
                    addItem(container, _i, data: PanelEntityContainer) {
                        count++
                        if (count >= maxEntities) {
                            editableListAddButton.prop('disabled', true)
                        }

                        data.element = container

                        if (!Object.prototype.hasOwnProperty.call(data, 'entry')) {
                            data.entry = { type: 'delete', entityId: '', iconColor: DEFAULT_COLOR }
                        }
                        const entry = data.entry
                        if (!Object.prototype.hasOwnProperty.call(entry, 'type')) {
                            entry.type = 'delete' // FIXME
                        }
                        container.css({
                            overflow: 'hidden',
                            whiteSpace: 'nowrap',
                        })

                        // #region create fragment
                        // FIXME
                        const fragment = document.createDocumentFragment()
                        const row1 = $('<div/>', { style: 'display: flex' }).appendTo(fragment)
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
                        const row1_1 = $('<div/>').appendTo(row1)
                        const selectTypeField = $('<select/>', {
                            class: 'node-input-entity-type',
                            style: 'min-width: 120px; width:120px; margin-right: 10px',
                        }).appendTo(row1_1)
                        validEntities.forEach((item) => {
                            const i18n = _i18n('label.' + item, 'nspanel-panel', 'common')
                            $('<option/>').val(item).text(i18n).appendTo(selectTypeField)
                        })

                        const row1_2 = $('<div/>', { style: 'flex-grow: 1;' }).appendTo(row1)
                        _createLabel(row1_2, 'Id:') // TODO: i18n
                        const entityIdField = $('<input/>', {
                            class: 'node-input-entity-id',
                            style: 'width: 10em',
                            type: 'text',
                        }).appendTo(row1_2)

                        const row1_3 = $('<div/>', { style: 'flex-grow: 1;' }).appendTo(row1)
                        _createLabel(row1_3, 'Label:') // TODO: i18n
                        const entityTextField = $('<input/>', {
                            class: 'node-input-entity-text',
                            style: 'width: 10em',
                            type: 'text',
                        }).appendTo(row1_3)

                        // #endregion row1

                        // #region rowOptionalValue
                        const rowOptionalValue_1 = $('<div/>').appendTo(rowOptionalValue)
                        $('<div/>', { style: 'width: 42px; padding-right: 10px; box-sizing: border-box' }).appendTo(
                            rowOptionalValue_1
                        )
                        const rowOptionalValue_2 = $('<div/>', { style: 'flex-grow: 1;' }).appendTo(rowOptionalValue)
                        _createLabel(rowOptionalValue_2, 'Text:') // TODO: i18n
                        const optionalValueField = $('<input/>', {
                            class: 'node-input-entity-optionalvalue',
                            style: 'width: 10em',
                            type: 'text',
                        }).appendTo(rowOptionalValue_2)
                        // #endregion row2

                        // #region rowIcon
                        const rowIcon_1 = $('<div/>').appendTo(rowIcon)
                        $('<div/>', { style: 'width: 42px; padding-right: 10px; box-sizing: border-box' }).appendTo(
                            rowIcon_1
                        )

                        const rowIcon_2 = $('<div/>', { style: 'flex-grow: 1;' }).appendTo(rowIcon)

                        _createLabel(rowIcon_2, 'Icon:') // TODO: i18n
                        const entityIconField = $('<input/>', {
                            class: 'node-input-entity-icon',
                            style: 'width: 10em',
                            type: 'text',
                        }).appendTo(rowIcon_2)

                        _createLabel(rowIcon_2, 'Farbe:') // TODO: i18n
                        const entityIconColorField = $('<input/>', {
                            class: 'node-input-entity-iconcolor',
                            style: 'width: 42px',
                            type: 'color',
                        }).appendTo(rowIcon_2)
                        // #endregion rowIcon

                        // #region rowShutter
                        const rowShutter_1 = $('<div/>').appendTo(rowShutter)
                        $('<div/>', { style: 'width: 42px; padding-right: 10px; box-sizing: border-box' }).appendTo(
                            rowShutter_1
                        )

                        const rowShutter_2 = $('<div/>', { style: 'flex-grow: 1;' }).appendTo(rowShutter)

                        // TODO: Label "Icons:"
                        _createLabel(rowShutter_2, 'Ab') // TODO: i18n
                        const iconDownField = $('<input/>', {
                            class: 'node-input-entity-shutter-icondown',
                            style: 'width: 6em',
                            type: 'text',
                        }).appendTo(rowShutter_2)

                        _createLabel(rowShutter_2, 'Stop') // TODO: i18n
                        const iconStopField = $('<input/>', {
                            class: 'node-input-entity-shutter-iconstop',
                            style: 'width: 6em',
                            type: 'text',
                        }).appendTo(rowShutter_2)

                        _createLabel(rowShutter_2, 'Auf') // TODO: i18n
                        const iconUpField = $('<input/>', {
                            class: 'node-input-entity-shutter-iconup',
                            style: 'width: 6em',
                            type: 'text',
                        }).appendTo(rowShutter_2)
                        // #endregion rowShutter

                        // #region rowShutterTiltIcons
                        const rowShutterTiltIcons_1 = $('<div/>').appendTo(rowShutterTiltIcons)
                        $('<div/>', { style: 'width: 42px; padding-right: 10px; box-sizing: border-box' }).appendTo(
                            rowShutterTiltIcons_1
                        )
                        // TODO: input has tilt
                        const rowShutterTiltIcons_2 = $('<div/>', { style: 'flex-grow: 1;' }).appendTo(
                            rowShutterTiltIcons
                        )

                        // TODO: Label "TILT"
                        _createLabel(rowShutterTiltIcons_2, 'Tilt') // TODO: i18n
                        const hasTiltField = $('<input/>', {
                            class: 'node-input-entity-shutter-hastilt',
                            style: 'width: 1em',
                            type: 'checkbox',
                        }).appendTo(rowShutterTiltIcons_2)

                        _createLabel(rowShutterTiltIcons_2, 'Links') // TODO: i18n
                        const iconTiltLeftField = $('<input/>', {
                            class: 'node-input-entity-shutter-icontiltleft',
                            style: 'width: 6em',
                            type: 'text',
                        }).appendTo(rowShutterTiltIcons_2)

                        _createLabel(rowShutterTiltIcons_2, 'Stopp') // TODO: i18n
                        const iconTiltStopField = $('<input/>', {
                            class: 'node-input-entity-shutter-icontiltstop',
                            style: 'width: 6em',
                            type: 'text',
                        }).appendTo(rowShutterTiltIcons_2)

                        _createLabel(rowShutterTiltIcons_2, 'Rechts') // TODO: i18n
                        const iconTiltRightField = $('<input/>', {
                            class: 'node-input-entity-shutter-icontiltright',
                            style: 'width: 6em',
                            type: 'text',
                        }).appendTo(rowShutterTiltIcons_2)
                        // #endregion rowShutterTiltIcons

                        // #region rowNumber
                        const rowNumber_1 = $('<div/>').appendTo(rowNumber)
                        $('<div/>', { style: 'width: 42px; padding-right: 10px; box-sizing: border-box' }).appendTo(
                            rowNumber_1
                        )
                        const rowNumber_2 = $('<div/>', { style: 'flex-grow: 1;' }).appendTo(rowNumber)
                        _createLabel(rowNumber_2, 'Min:') // TODO: i18n
                        const numberMinField = $('<input/>', {
                            class: 'node-input-entity-num-min',
                            style: 'width: 10em',
                            type: 'number',
                        }).appendTo(rowNumber_2)

                        _createLabel(rowNumber_2, 'Max:') // TODO: i18n
                        const numberMaxField = $('<input />', {
                            class: 'node-input-entity-num-max',
                            style: 'width: 10em',
                            type: 'number',
                        }).appendTo(rowNumber_2)
                        // #endregion rowNumber

                        // #region rowFanModes
                        const rowFan_1 = $('<div/>').appendTo(rowFanModes)
                        $('<div/>', { style: 'width: 42px; padding-right: 10px; box-sizing: border-box' }).appendTo(
                            rowFan_1
                        )

                        const rowFan_2 = $('<div/>', { style: 'flex-grow: 1;' }).appendTo(rowFanModes)

                        // TODO: Label "Icons:"
                        _createLabel(rowFan_2, 'Modus 1:') // TODO: i18n
                        const fanMode1Field = $('<input/>', {
                            class: 'node-input-entity-fan-mode1',
                            style: 'width: 6em',
                            type: 'text',
                        }).appendTo(rowFan_2)

                        _createLabel(rowFan_2, 'Modus 2:') // TODO: i18n
                        const fanMode2Field = $('<input/>', {
                            class: 'node-input-entity-fan-mode2',
                            style: 'width: 6em',
                            type: 'text',
                        }).appendTo(rowFan_2)

                        _createLabel(rowFan_2, 'Modus 3:') // TODO: i18n
                        const fanMode3Field = $('<input/>', {
                            class: 'node-input-entity-fan-mode3',
                            style: 'width: 6em',
                            type: 'text',
                        }).appendTo(rowFan_2)
                        // #endregion rowFanModes

                        // #region rowLight
                        const rowLight_1 = $('<div/>').appendTo(rowLight)
                        $('<div/>', { style: 'width: 42px; padding-right: 10px; box-sizing: border-box' }).appendTo(
                            rowLight_1
                        )
                        const rowLight_2 = $('<div/>', { style: 'flex-grow: 1;' }).appendTo(rowLight)

                        _createLabel(rowLight_2, 'dimmbar:') // TODO: i18n
                        const lightDimmableField = $('<input/>', {
                            class: 'node-input-entity-light-dimmable',
                            style: 'width: 6em',
                            type: 'checkbox',
                        }).appendTo(rowLight_2)

                        _createLabel(rowLight_2, 'Temperatur:') // TODO: i18n
                        const lightColorTemperatureField = $('<input/>', {
                            class: 'node-input-entity-light-colorTemperature',
                            style: 'width: 6em',
                            type: 'checkbox',
                        }).appendTo(rowLight_2)

                        _createLabel(rowLight_2, 'Farbe:') // TODO: i18n
                        const lightColorField = $('<input/>', {
                            class: 'node-input-entity-light-color',
                            style: 'width: 6em',
                            type: 'checkbox',
                        }).appendTo(rowLight_2)

                        // #endregion rowLight
                        // #endregion create fragment

                        selectTypeField.on('change', () => {
                            const val = '' + selectTypeField.val()
                            const entityTypeAttrs = PANEL_ENTITY_TYPE_ATTRS.get(val)
                            if (entityTypeAttrs !== undefined) {
                                row1_2.toggle(entityTypeAttrs.hasId)
                                row1_3.toggle(entityTypeAttrs.hasLabel)
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
                        count--
                    },

                    sortItems(_events) {},

                    sortable: true,
                    removable: true,
                })
                editableListAddButton = (
                    domControl.prop('tagName') === 'ol' ? domControl.closest('.red-ui-editableList') : domControl
                ).find('.red-ui-editableList-addButton')
            }

            function _addItems(items) {
                if (items !== undefined && Array.isArray(items)) {
                    items.forEach((item) => {
                        domControlList.editableList('addItem', { entry: item })
                    })
                }
            }

            function _empty() {
                domControlList.editableList('empty')
            }

            function _getEntities() {
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

                    if (_validate.stringIsNotNullOrEmpty(optionalValue)) {
                        entity.optionalValue = optionalValue
                    }

                    switch (type) {
                        case 'shutter':
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

                            if (_validate.stringIsNotNullOrEmpty(iconDown)) {
                                entity.iconDown = iconDown
                            }
                            if (_validate.stringIsNotNullOrEmpty(iconUp)) {
                                entity.iconUp = iconUp
                            }
                            if (_validate.stringIsNotNullOrEmpty(iconStop)) {
                                entity.iconStop = iconStop
                            }

                            entity.hasTilt = hasTilt
                            if (_validate.stringIsNotNullOrEmpty(iconTiltLeft)) {
                                entity.iconTiltLeft = iconTiltLeft
                            }

                            if (_validate.stringIsNotNullOrEmpty(iconTiltStop)) {
                                entity.iconTiltStop = iconTiltStop
                            }

                            if (_validate.stringIsNotNullOrEmpty(iconTiltRight)) {
                                entity.iconTiltRight = iconTiltRight
                            }

                            break

                        case 'number':
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

                        case 'fan':
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

                        case 'light':
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

                    entities.push(entity)
                })
                return entities
            }

            _makeControl()
            _addItems(initialData)

            return _api
        }
        // #endregion editable entity list

        return {
            editableEntitiesList: _createEditableEntitiesList,
            editableEventList: _createEditableEventList,
            pageTypedInput: _createPageTypedInput,
            payloadTypedInput: _createPayloadTypedInput,
        }
    })()
    // #endregion ui generation

    // #region API generation
    NSPanelLui['_'] = _i18n

    NSPanelLui.Editor = NSPanelLui.Editor || {
        _: _i18n,
        validate: _validate,
        create: _create,
        util: {
            normalizeLabel: _normalizeLabel,
            getNodeLabel: _getNodeLabel,
        },
    }
    NSPanelLui.Events = NSPanelLui.Events || {
        allNavigationEvents: _allValidNavigationEvents,
        allButtonEvents: _allValidButtonEvents,
        addHardwareButtonEventsIfApplicable: _addHardwareButtonEventsIfApplicable,
    }
    // #endregion API generation
})(RED, $)
