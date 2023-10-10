//FIXME: cannot use imports.... due to Object.defineProperty(exports, "__esModule", { value: true }) issue

declare var RED

var NSPanelLui = NSPanelLui || {}

;(function (RED, $) {
    //#region events
    interface ValidEventSpec {
        event: string
        label: string
    }
    interface EventMappingContainer {
        entry: EventMapping
        element?: any
    }

    interface EventMapping {
        event: string
        value: string
        t: string
        icon?: string
        iconColor?: string
        data?: string
        dataType?: string
    }
    //#endregion events

    //#region entities
    interface EventTypeAttrs {
        hasId: boolean
        hasLabel: boolean
        hasIcon: boolean
        hasOptionalValue: boolean
        isShutter?: boolean
        isNumber?: boolean
        isFan?: boolean
        isLight?: boolean
    }

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
        var result: string[] = Array.from(PANEL_ENTITY_TYPE_ATTRS.keys())
        return result
    })()

    interface PanelEntity {
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

    interface PanelEntityContainer {
        entry: PanelEntity
        element?: any
    }
    //#endregion entities

    interface PanelBasedConfig {
        id: string
        type: string
        name: string

        nsPanel: string
        title: string | undefined
    }

    interface IPageConfig extends PanelBasedConfig {
        events: EventMapping[]
    }

    interface typedInputParams {
        default?: string
        types: typedInputTypeParams[]
    }

    interface typedInputTypeParams {
        value: string
        icon?: string
        label: string
        type: string
        types?: string | string[]
        options?: any
    }

    const DEFAULT_COLOR = '#ffffff'

    //#region i18n and labels
    const _i18n = (key: string, dict: string, group?: string) => {
        return RED._(`node-red-contrib-nspanel-lui/${dict}:${group ?? dict}.${key}`)
    }
    const _normalizeLabel = function (node: any) {
        return _validate.stringIsNotNullOrEmpty(node.name) ? node.name : '[' + node.type + ':' + node.id + ']'
    }
    const _getNodeLabel = function (node: any) {
        var panelNode = RED.nodes.node(node.nsPanel)

        var label = '[' + (panelNode ? panelNode.name : NSPanelLui._('label.unassigned', node.type, 'common')) + '] '
        label += node.name || NSPanelLui._('defaults.name', node.type)

        return label
    }
    //#endregion i18n and labels

    //#region validation helpers
    const _validate = (function () {
        const _numberInRange = (v: any, min: number, max: number): boolean => {
            const n = Number(v)
            return isNaN(n) === false && n >= min && n <= max
        }

        const _limitNumberToRange = (v: any, min: number, max: number, defaultValue: number): number => {
            const n = Number(v)
            if (isNaN(n)) return defaultValue === undefined ? min : defaultValue

            if (v < min) return min
            if (v > max) return max

            return v
        }
        const _stringIsNotNullOrEmpty = (str: any): boolean => {
            return str !== undefined && str !== null && typeof str == 'string' ? str.trim().length > 0 : false
        }
        return {
            isNumberInRange: _numberInRange,
            limitNumberToRange: _limitNumberToRange,
            stringIsNotNullOrEmpty: _stringIsNotNullOrEmpty,
        }
    })()
    //#endregion validation helpers

    //#region ui generation
    const _make = (function () {
        function _makePageTypedInput(
            field: JQuery,
            defaultType: string,
            nodeConfig: PanelBasedConfig,
            panelAttr: string
        ) {
            var currentPanel = field.val() || nodeConfig[panelAttr]
            var typedInputParams: typedInputParams = {
                default: defaultType || 'msg',
                types: [{ value: 'msg', label: 'msg.', type: 'msg', types: ['str'] }],
            }

            if (currentPanel != '_ADD_' && currentPanel !== undefined) {
                const myId = nodeConfig.id
                var panelNode = RED.nodes.node(currentPanel)
                // @ts-ignore 2339
                var knownPages: nodeRed.Node<any>[] = panelNode.users || []
                var pageNodeType: typedInputTypeParams = {
                    value: 'page',
                    icon: 'fa fa-desktop',
                    type: 'page',
                    label: 'Page',
                    options: [],
                }

                //FIXME: update on panel changed
                for (var i in knownPages) {
                    const item = knownPages[i]
                    if (item.id !== myId && item.type.startsWith('nspanel-page')) {
                        pageNodeType.options.push({
                            value: item.id,
                            label: _normalizeLabel(item),
                        })
                    }
                }

                typedInputParams.types.push(pageNodeType)
                typedInputParams.default = defaultType || 'page'
            }

            field.typedInput(typedInputParams)
        }

        function _makePayloadTypedInput(field, defaultType = undefined) {
            return field.typedInput({
                default: defaultType || 'str',
                //['msg', 'flow', 'global', 'str', 'num', 'bool', 'json', 'bin', 'env'],
                types: ['str', 'json'],
            })
        }

        function _createLabel(parent: JQuery, text: string, width: string = '50px') {
            var label = $('<label/>', {
                style: 'margin-left: 14px; vertical-align: middle; width: ' + width, // margin-top: 7px
            }).appendTo(parent)
            $('<span/>').text(text).appendTo(label)
            return label
        }

        // #region editable event list

        const _makeEditableEventList = function (
            node: IPageConfig,
            controlDomSelector: string,
            allValidEvents: ValidEventSpec[],
            initialData: EventMapping[]
        ) {
            var pageEvents = {
                all: allValidEvents.slice(),
                available: [],
                used: [],
            }
            pageEvents.all.forEach((item) => pageEvents.available.push(item.event))

            const domControl = $(controlDomSelector) //TODO: if (domControl.length = 0) => not found
            const domControlList = domControl.prop('tagName') == 'ol' ? domControl : domControl.find('ol')

            if (domControlList.length == 0) return //TODO: if (domControl.length = 0) => not found

            var updateLock = false
            function _updateSelectEventFields(fieldToFocus = null) {
                if (updateLock) return

                updateLock = true
                var usedEvents = []
                var avaiableEvents = []
                var eventInputNode = []

                domControl.find('.node-input-event').each((i, ele) => {
                    usedEvents.push($(ele).val())
                    eventInputNode.push($(ele))
                })
                pageEvents.all.forEach((item) => {
                    if (!usedEvents.includes(item.event)) avaiableEvents.push(item.event)
                })

                eventInputNode.forEach((node) => {
                    const usedVal = node.val()
                    node.empty()
                    pageEvents.all.forEach((item) => {
                        if (!usedEvents.includes(item.event) || item.event == usedVal) {
                            $('<option/>').val(item.event).text(item.label).appendTo(node)
                        }
                        node.val(usedVal != null ? usedVal : node.children().first().val())
                    })
                })

                pageEvents.used = usedEvents
                pageEvents.available = avaiableEvents

                updateLock = false
            }

            function _makeControl() {
                var editableListAddButton
                function _updateEditableListAddButton() {
                    const disableAdd = pageEvents.available.length == 1
                    editableListAddButton.prop('disabled', disableAdd)
                }

                domControlList.editableList({
                    addItem: function (container, i, data: EventMappingContainer) {
                        _updateEditableListAddButton()
                        data.element = container

                        if (!data.hasOwnProperty('entry')) {
                            data.entry = { event: pageEvents.available[0], t: undefined, value: undefined }
                        }
                        var entry = data.entry
                        if (!entry.hasOwnProperty('event')) {
                            entry.event = pageEvents.available[0]
                        }
                        container.css({
                            overflow: 'hidden',
                            whiteSpace: 'nowrap',
                        })

                        // #region create fragment
                        var fragment = document.createDocumentFragment()
                        var row1 = $('<div/>', { style: 'display: flex' }).appendTo(fragment)
                        var row2 = $('<div/>', { style: 'display:flex; margin-top:8px;' }).appendTo(fragment).hide()

                        var row1_1 = $('<div/>', { style: 'display: flex;' }).appendTo(row1)
                        var selectEventField = $('<select/>', {
                            class: 'node-input-event',
                            style: 'width: 120px; margin-right: 10px',
                        }).appendTo(row1_1)

                        var row1_2 = $('<div/>', { style: 'display: flex; padding-right: 10px;' }).appendTo(row1)
                        _createLabel(row1_2, 'Icon:') //TODO: i18n
                        var iconField = $('<input/>', {
                            class: 'node-input-event-icon',
                            style: 'width: 10em',
                            type: 'text',
                        }).appendTo(row1_2)

                        var row1_3 = $('<div/>', { style: 'flex-grow: 1;' }).appendTo(row1)
                        var valueField = $('<input/>', {
                            class: 'node-input-event-value',
                            style: 'width: 100%',
                            type: 'text',
                        }).appendTo(row1_3)

                        var row2_1 = $('<div/>', { style: 'display: flex;' }).appendTo(row2)
                        $('<div/>', { style: 'width: 130px; padding-right: 10px; box-sizing: border-box' }).appendTo(
                            row2_1
                        )

                        var row2_2 = $('<div/>', { style: 'flex-grow: 1; margin-top: 8px' }).appendTo(row2)

                        var valueDataField = $('<input/>', {
                            class: 'node-input-event-data',
                            style: 'width: 100%',
                        }).appendTo(row2_2)

                        _makePageTypedInput(valueField, entry.t, node, 'nsPanel')
                        _makePayloadTypedInput(valueDataField)
                        // #endregion create fragment

                        // placeholder for following call to update event select fields
                        selectEventField.append($('<option />').val(pageEvents.available[0]))

                        selectEventField.on('change', () => {
                            _updateSelectEventFields()
                        })
                        valueField.on('change', (event, type, value) => {
                            if (type == 'msg') {
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

                    removeItem: function (listItem) {
                        _updateSelectEventFields()
                        _updateEditableListAddButton()
                    },

                    sortItems: function (events) {},

                    sortable: true,
                    removable: true,
                })
                editableListAddButton = (
                    domControl.prop('tagName') == 'ol' ? domControl.closest('.red-ui-editableList') : domControl
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
                var events = []
                var eventItems = domControlList.editableList('items')

                eventItems.each((i, ele) => {
                    const listItem = $(ele)

                    var entry: EventMapping
                    const eventName = listItem.find('select').val().toString()
                    const icon = listItem.find('.node-input-event-icon').val().toString()
                    const entryT = listItem.find('.node-input-event-value').typedInput('type').toString()
                    const entryValue = listItem.find('.node-input-event-value').typedInput('value').toString()

                    entry = { event: eventName, t: entryT, value: entryValue, icon: icon }

                    if (entry.t == 'msg') {
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
                setPanel: (panel) => {}, //FIXME: update on panel changed
                addItems: (items) => _addItems(items),
                empty: () => _empty(),
                getEvents: () => _getEvents(),
            }
        }
        // #endregion editable event list

        // #region editable entity list
        const _makeEditableEntitiesList = function (
            node: IPageConfig,
            controlDomSelector: string,
            maxEntities: number,
            initialData: PanelEntity[],
            validEntities: string[] = ALL_PANEL_ENTITY_TYPES
        ) {
            const domControl = $(controlDomSelector) //TODO: if (domControl.length = 0) => not found
            const domControlList = domControl.prop('tagName') == 'ol' ? domControl : domControl.find('ol')

            if (domControlList.length == 0) return //TODO: if (domControl.length = 0) => not found

            function _makeControl() {
                var editableListAddButton
                var count: number = 0
                domControlList.editableList({
                    addItem: function (container, i, data: PanelEntityContainer) {
                        count++
                        if (count >= maxEntities) {
                            editableListAddButton.prop('disabled', true)
                        }

                        data.element = container

                        if (!data.hasOwnProperty('entry')) {
                            data.entry = { type: 'delete', entityId: '', iconColor: DEFAULT_COLOR }
                        }
                        var entry = data.entry
                        if (!entry.hasOwnProperty('type')) {
                            entry.type = 'delete' //FIXME
                        }
                        container.css({
                            overflow: 'hidden',
                            whiteSpace: 'nowrap',
                        })

                        // #region create fragment
                        //FIXME
                        var fragment = document.createDocumentFragment()
                        var row1 = $('<div/>', { style: 'display: flex' }).appendTo(fragment)
                        var rowOptionalValue = $('<div/>', { style: 'display: flex; margin-top:8px;' }).appendTo(
                            fragment
                        )
                        var rowIcon = $('<div/>', { style: 'display: flex; margin-top:8px;' }).appendTo(fragment).hide()
                        var rowShutter = $('<div/>', { style: 'display: flex; margin-top:8px;' })
                            .appendTo(fragment)
                            .hide()
                        var rowShutterTiltIcons = $('<div/>', { style: 'display: flex; margin-top:8px;' })
                            .appendTo(fragment)
                            .hide()
                        var rowNumber = $('<div/>', { style: 'display: flex; margin-top:8px;' })
                            .appendTo(fragment)
                            .hide()
                        var rowFanModes = $('<div/>', { style: 'display: flex; margin-top:8px;' })
                            .appendTo(fragment)
                            .hide()
                        var rowLight = $('<div/>', { style: 'display: flex; margin-top:8px;' })
                            .appendTo(fragment)
                            .hide()

                        // #region row1
                        var row1_1 = $('<div/>').appendTo(row1)
                        var selectTypeField = $('<select/>', {
                            class: 'node-input-entity-type',
                            style: 'min-width: 120px; width:120px; margin-right: 10px',
                        }).appendTo(row1_1)
                        validEntities.forEach((item) => {
                            var i18n = _i18n('label.' + item, 'nspanel-panel', 'common')
                            $('<option/>').val(item).text(i18n).appendTo(selectTypeField)
                        })

                        var row1_2 = $('<div/>', { style: 'flex-grow: 1;' }).appendTo(row1)
                        _createLabel(row1_2, 'Id:') //TODO: i18n
                        var entityIdField = $('<input/>', {
                            class: 'node-input-entity-id',
                            style: 'width: 10em',
                            type: 'text',
                        }).appendTo(row1_2)

                        var row1_3 = $('<div/>', { style: 'flex-grow: 1;' }).appendTo(row1)
                        _createLabel(row1_3, 'Label:') //TODO: i18n
                        var entityTextField = $('<input/>', {
                            class: 'node-input-entity-text',
                            style: 'width: 10em',
                            type: 'text',
                        }).appendTo(row1_3)

                        // #endregion row1

                        // #region rowOptionalValue
                        var rowOptionalValue_1 = $('<div/>').appendTo(rowOptionalValue)
                        $('<div/>', { style: 'width: 42px; padding-right: 10px; box-sizing: border-box' }).appendTo(
                            rowOptionalValue_1
                        )
                        var rowOptionalValue_2 = $('<div/>', { style: 'flex-grow: 1;' }).appendTo(rowOptionalValue)
                        _createLabel(rowOptionalValue_2, 'Text:') //TODO: i18n
                        var optionalValueField = $('<input/>', {
                            class: 'node-input-entity-optionalvalue',
                            style: 'width: 10em',
                            type: 'text',
                        }).appendTo(rowOptionalValue_2)
                        // #endregion row2

                        // #region rowIcon
                        var rowIcon_1 = $('<div/>').appendTo(rowIcon)
                        $('<div/>', { style: 'width: 42px; padding-right: 10px; box-sizing: border-box' }).appendTo(
                            rowIcon_1
                        )

                        var rowIcon_2 = $('<div/>', { style: 'flex-grow: 1;' }).appendTo(rowIcon)

                        _createLabel(rowIcon_2, 'Icon:') //TODO: i18n
                        var entityIconField = $('<input/>', {
                            class: 'node-input-entity-icon',
                            style: 'width: 10em',
                            type: 'text',
                        }).appendTo(rowIcon_2)

                        _createLabel(rowIcon_2, 'Farbe:') //TODO: i18n
                        var entityIconColorField = $('<input/>', {
                            class: 'node-input-entity-iconcolor',
                            style: 'width: 42px',
                            type: 'color',
                        }).appendTo(rowIcon_2)
                        // #endregion rowIcon

                        // #region rowShutter
                        var rowShutter_1 = $('<div/>').appendTo(rowShutter)
                        $('<div/>', { style: 'width: 42px; padding-right: 10px; box-sizing: border-box' }).appendTo(
                            rowShutter_1
                        )

                        var rowShutter_2 = $('<div/>', { style: 'flex-grow: 1;' }).appendTo(rowShutter)

                        // TODO: Label "Icons:"
                        _createLabel(rowShutter_2, 'Ab') //TODO: i18n
                        var iconDownField = $('<input/>', {
                            class: 'node-input-entity-shutter-icondown',
                            style: 'width: 6em',
                            type: 'text',
                        }).appendTo(rowShutter_2)

                        _createLabel(rowShutter_2, 'Stop') //TODO: i18n
                        var iconStopField = $('<input/>', {
                            class: 'node-input-entity-shutter-iconstop',
                            style: 'width: 6em',
                            type: 'text',
                        }).appendTo(rowShutter_2)

                        _createLabel(rowShutter_2, 'Auf') //TODO: i18n
                        var iconUpField = $('<input/>', {
                            class: 'node-input-entity-shutter-iconup',
                            style: 'width: 6em',
                            type: 'text',
                        }).appendTo(rowShutter_2)
                        // #endregion rowShutter

                        // #region rowShutterTiltIcons
                        var rowShutterTiltIcons_1 = $('<div/>').appendTo(rowShutterTiltIcons)
                        $('<div/>', { style: 'width: 42px; padding-right: 10px; box-sizing: border-box' }).appendTo(
                            rowShutterTiltIcons_1
                        )
                        // TODO: input has tilt
                        var rowShutterTiltIcons_2 = $('<div/>', { style: 'flex-grow: 1;' }).appendTo(
                            rowShutterTiltIcons
                        )

                        // TODO: Label "TILT"
                        _createLabel(rowShutterTiltIcons_2, 'Tilt') //TODO: i18n
                        var hasTiltField = $('<input/>', {
                            class: 'node-input-entity-shutter-hastilt',
                            style: 'width: 1em',
                            type: 'checkbox',
                        }).appendTo(rowShutterTiltIcons_2)

                        _createLabel(rowShutterTiltIcons_2, 'Links') //TODO: i18n
                        var iconTiltLeftField = $('<input/>', {
                            class: 'node-input-entity-shutter-icontiltleft',
                            style: 'width: 6em',
                            type: 'text',
                        }).appendTo(rowShutterTiltIcons_2)

                        _createLabel(rowShutterTiltIcons_2, 'Stopp') //TODO: i18n
                        var iconTiltStopField = $('<input/>', {
                            class: 'node-input-entity-shutter-icontiltstop',
                            style: 'width: 6em',
                            type: 'text',
                        }).appendTo(rowShutterTiltIcons_2)

                        _createLabel(rowShutterTiltIcons_2, 'Rechts') //TODO: i18n
                        var iconTiltRightField = $('<input/>', {
                            class: 'node-input-entity-shutter-icontiltright',
                            style: 'width: 6em',
                            type: 'text',
                        }).appendTo(rowShutterTiltIcons_2)
                        // #endregion rowShutterTiltIcons

                        // #region rowNumber
                        var rowNumber_1 = $('<div/>').appendTo(rowNumber)
                        $('<div/>', { style: 'width: 42px; padding-right: 10px; box-sizing: border-box' }).appendTo(
                            rowNumber_1
                        )
                        var rowNumber_2 = $('<div/>', { style: 'flex-grow: 1;' }).appendTo(rowNumber)
                        _createLabel(rowNumber_2, 'Min:') //TODO: i18n
                        var numberMinField = $('<input/>', {
                            class: 'node-input-entity-num-min',
                            style: 'width: 10em',
                            type: 'number',
                        }).appendTo(rowNumber_2)

                        _createLabel(rowNumber_2, 'Max:') //TODO: i18n
                        var numberMaxField = $('<input />', {
                            class: 'node-input-entity-num-max',
                            style: 'width: 10em',
                            type: 'number',
                        }).appendTo(rowNumber_2)
                        // #endregion rowNumber

                        // #region rowFanModes
                        var rowFan_1 = $('<div/>').appendTo(rowFanModes)
                        $('<div/>', { style: 'width: 42px; padding-right: 10px; box-sizing: border-box' }).appendTo(
                            rowFan_1
                        )

                        var rowFan_2 = $('<div/>', { style: 'flex-grow: 1;' }).appendTo(rowFanModes)

                        // TODO: Label "Icons:"
                        _createLabel(rowFan_2, 'Modus 1:') //TODO: i18n
                        var fanMode1Field = $('<input/>', {
                            class: 'node-input-entity-fan-mode1',
                            style: 'width: 6em',
                            type: 'text',
                        }).appendTo(rowFan_2)

                        _createLabel(rowFan_2, 'Modus 2:') //TODO: i18n
                        var fanMode2Field = $('<input/>', {
                            class: 'node-input-entity-fan-mode2',
                            style: 'width: 6em',
                            type: 'text',
                        }).appendTo(rowFan_2)

                        _createLabel(rowFan_2, 'Modus 3:') //TODO: i18n
                        var fanMode3Field = $('<input/>', {
                            class: 'node-input-entity-fan-mode3',
                            style: 'width: 6em',
                            type: 'text',
                        }).appendTo(rowFan_2)
                        // #endregion rowFanModes

                        // #region rowLight
                        var rowLight_1 = $('<div/>').appendTo(rowLight)
                        $('<div/>', { style: 'width: 42px; padding-right: 10px; box-sizing: border-box' }).appendTo(
                            rowLight_1
                        )
                        var rowLight_2 = $('<div/>', { style: 'flex-grow: 1;' }).appendTo(rowLight)

                        _createLabel(rowLight_2, 'dimmbar:') //TODO: i18n
                        var lightDimmableField = $('<input/>', {
                            class: 'node-input-entity-light-dimmable',
                            style: 'width: 6em',
                            type: 'checkbox',
                        }).appendTo(rowLight_2)

                        _createLabel(rowLight_2, 'Temperatur:') //TODO: i18n
                        var lightColorTemperatureField = $('<input/>', {
                            class: 'node-input-entity-light-colorTemperature',
                            style: 'width: 6em',
                            type: 'checkbox',
                        }).appendTo(rowLight_2)

                        _createLabel(rowLight_2, 'Farbe:') //TODO: i18n
                        var lightColorField = $('<input/>', {
                            class: 'node-input-entity-light-color',
                            style: 'width: 6em',
                            type: 'checkbox',
                        }).appendTo(rowLight_2)

                        // #endregion rowLight

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

                    removeItem: function (listItem) {
                        count--
                    },

                    sortItems: function (events) {},

                    sortable: true,
                    removable: true,
                })
                editableListAddButton = (
                    domControl.prop('tagName') == 'ol' ? domControl.closest('.red-ui-editableList') : domControl
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
                var entities = []
                var entityItems = domControlList.editableList('items')

                entityItems.each((i, ele) => {
                    var entity: PanelEntity
                    const listItem = $(ele)

                    const type = listItem.find('.node-input-entity-type').val().toString()
                    const id = listItem.find('.node-input-entity-id').val().toString()
                    const text = listItem.find('.node-input-entity-text').val().toString()
                    const optionalValue = listItem.find('.node-input-entity-optionalvalue').val().toString()
                    const icon = listItem.find('.node-input-entity-icon').val().toString()
                    const iconColor = listItem.find('.node-input-entity-iconcolor').val().toString()
                    entity = { type: type, entityId: id, text: text, icon: icon, iconColor: iconColor }

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
                            var minStr = listItem.find('.node-input-entity-num-min').val().toString()
                            var maxStr = listItem.find('.node-input-entity-num-max').val().toString()
                            var min = Number(minStr)
                            var max = Number(maxStr)

                            if (!isNaN(min)) {
                                entity.min = min
                            }
                            if (!isNaN(max)) {
                                entity.max = max
                            }
                            break

                        case 'fan':
                            const fanMode1 = listItem.find('.node-input-entity-fan-mode1').val().toString()
                            const fanMode2 = listItem.find('.node-input-entity-fan-mode2').val().toString()
                            const fanMode3 = listItem.find('.node-input-entity-fan-mode3').val().toString()
                            var maxStr = listItem.find('.node-input-entity-num-max').val().toString()
                            var max = Number(maxStr)

                            if (!isNaN(max)) {
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

            return {
                addItems: (items) => _addItems(items),
                empty: () => _empty(),
                getEntities: () => _getEntities(),
            }
        }
        // #endregion editable entity list

        return {
            editableEntitiesList: _makeEditableEntitiesList,
            editableEventList: _makeEditableEventList,
            pageTypedInput: _makePageTypedInput,
            payloadTypedInput: _makePayloadTypedInput,
        }
    })()
    //#endregion ui generation

    //#region API generation
    NSPanelLui['_'] = _i18n

    NSPanelLui.Editor = NSPanelLui.Editor || {
        _: _i18n,
        validate: _validate,
        make: _make,
        util: {
            _normalizeLabel: _normalizeLabel,
            getNodeLabel: _getNodeLabel,
        },
    }
    //#endregion API generation
})(RED, $)
