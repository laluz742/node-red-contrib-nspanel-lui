// eslint-disable-next-line no-var
declare var RED

// #region types
type ValidEventDescriptor = import('../types/nspanel-lui-editor').ValidEventDescriptor
type EventMapping = import('../types/nspanel-lui-editor').EventMapping
type PanelEntity = import('../types/nspanel-lui-editor').PanelEntity
type IPageConfig = import('../types/nspanel-lui-editor').IPageConfig
type PanelBasedConfig = import('../types/nspanel-lui-editor').PanelBasedConfig

type EventTypeAttrs = import('../types/nspanel-lui-editor').EventTypeAttrs
type PanelEntityContainer = import('../types/nspanel-lui-editor').PanelEntityContainer
type TypedInputParams = import('../types/nspanel-lui-editor').TypedInputParams
type TypedInputTypeParams = import('../types/nspanel-lui-editor').TypedInputTypeParams
type EventMappingContainer = import('../types/nspanel-lui-editor').EventMappingContainer
// #endregion types

var NSPanelLui = NSPanelLui || {} // eslint-disable-line

// eslint-disable-next-line func-names, @typescript-eslint/no-shadow
;(function (RED, $) {
    if (NSPanelLui.Editor != null) return

    // #region events
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

    class NSPanelLuiEditorValidate {
        public static numberInRange(v: any, min: number, max: number): boolean {
            const n = Number(v)
            return Number.isNaN(n) === false && n >= min && n <= max
        }

        public static limitNumberToRange(v: any, min: number, max: number, defaultValue: number): number {
            const n = Number(v)
            if (Number.isNaN(n)) return defaultValue === undefined ? min : defaultValue

            if (v < min) return min
            if (v > max) return max

            return v
        }

        public static stringIsNotNullOrEmpty(str: any): boolean {
            return str != null && typeof str === 'string' ? str.trim().length > 0 : false
        }
    }

    // #region i18n and labels
    const i18n = (key: string, dict: string, group?: string) => {
        return RED._(`node-red-contrib-nspanel-lui/${dict}:${group ?? dict}.${key}`)
    }
    const normalizeLabel = (node: any) => {
        return NSPanelLuiEditorValidate.stringIsNotNullOrEmpty(node.name) ? node.name : `[${node.type}:${node.id}]`
    }
    const getNodeLabel = (node: any) => {
        const panelNode = RED.nodes.node(node.nsPanel)
        const nodeName = NSPanelLuiEditorValidate.stringIsNotNullOrEmpty(node.name)
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

                        // #region create DOM
                        const template = $('#nspanel-lui-tpl-eventslist').contents().clone()
                        const tpl = $(container[0]).append($(template))

                        const ROW2 = tpl.find('.nlui-row-2').hide()

                        const selectEventField = tpl.find('.node-input-event')
                        const iconField = tpl.find('.node-input-event-icon')
                        const valueField = tpl.find('.node-input-event-value')
                        const valueDataField = tpl.find('.node-input-event-data')

                        createPageTypedInput(valueField, entry.t, node, 'nsPanel')
                        createPayloadTypedInput(valueDataField)
                        // #endregion create DOM

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

                        // #region create DOM
                        const template = $('#nspanel-lui-tpl-entitieslist').contents().clone()
                        const tpl = $(container[0]).append($(template))

                        const ROW1_2 = tpl.find('.nlui-row-1-2')
                        const ROW1_3 = tpl.find('.nlui-row-1-3')
                        const rowOptionalValue = tpl.find('.nlui-row-optional-value')
                        const rowIcon = tpl.find('.nlui-row-icon')
                        const rowShutter = tpl.find('.nlui-row-shutter')
                        const rowShutterTiltIcons = tpl.find('.nlui-row-shutter-tilt-icons')
                        const rowNumber = tpl.find('.nlui-row-number')
                        const rowFanModes = tpl.find('.nlui-row-fan-modes')
                        const rowLight = tpl.find('.nlui-row-light')
                        rowIcon.hide()
                        rowShutter.hide()
                        rowShutterTiltIcons.hide()
                        rowNumber.hide()
                        rowFanModes.hide()
                        rowLight.hide()

                        // #region row1
                        const selectTypeField = tpl.find('.node-input-entity-type')

                        validEntities.forEach((item) => {
                            const label = i18n(`label.${item}`, 'nspanel-panel', 'common')
                            $('<option/>').val(item).text(label).appendTo(selectTypeField)
                        })
                        const entityIdField = tpl.find('.node-input-entity-id')
                        const entityTextField = tpl.find('.node-input-entity-text')
                        // #endregion row1

                        // #region rowOptionalValue
                        const optionalValueField = tpl.find('.node-input-entity-optionalvalue')
                        // #endregion row2

                        // #region rowIcon
                        const entityIconField = tpl.find('.node-input-entity-icon')
                        const entityIconColorField = tpl.find('.node-input-entity-iconcolor')
                        // #endregion rowIcon

                        // #region rowShutter
                        const iconDownField = tpl.find('.node-input-entity-shutter-icondown')
                        const iconStopField = tpl.find('.node-input-entity-shutter-iconstop')
                        const iconUpField = tpl.find('.node-input-entity-shutter-iconup')
                        // #endregion rowShutter

                        // #region rowShutterTiltIcons
                        const hasTiltField = tpl.find('.node-input-entity-shutter-hastilt')
                        const iconTiltLeftField = tpl.find('.node-input-entity-shutter-icontiltleft')
                        const iconTiltStopField = tpl.find('.node-input-entity-shutter-icontiltstop')
                        const iconTiltRightField = tpl.find('.node-input-entity-shutter-icontiltright')
                        // #endregion rowShutterTiltIcons

                        // #region rowNumber
                        const numberMinField = tpl.find('.node-input-entity-num-min')
                        const numberMaxField = tpl.find('.node-input-entity-num-max')
                        // #endregion rowNumber

                        // #region rowFanModes
                        const fanMode1Field = tpl.find('.node-input-entity-fan-mode1')
                        const fanMode2Field = tpl.find('.node-input-entity-fan-mode2')
                        const fanMode3Field = tpl.find('node-input-entity-fan-mode3')
                        // #endregion rowFanModes

                        // #region rowLight
                        const lightDimmableField = tpl.find('.node-input-entity-light-dimmable')
                        const lightColorTemperatureField = tpl.find('.node-input-entity-light-colorTemperature')
                        const lightColorField = tpl.find('.node-input-entity-light-color')
                        // #endregion rowLight
                        // #endregion create DOM

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

                    if (NSPanelLuiEditorValidate.stringIsNotNullOrEmpty(optionalValue)) {
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

                            if (NSPanelLuiEditorValidate.stringIsNotNullOrEmpty(iconDown)) {
                                entity.iconDown = iconDown
                            }
                            if (NSPanelLuiEditorValidate.stringIsNotNullOrEmpty(iconUp)) {
                                entity.iconUp = iconUp
                            }
                            if (NSPanelLuiEditorValidate.stringIsNotNullOrEmpty(iconStop)) {
                                entity.iconStop = iconStop
                            }

                            entity.hasTilt = hasTilt
                            if (NSPanelLuiEditorValidate.stringIsNotNullOrEmpty(iconTiltLeft)) {
                                entity.iconTiltLeft = iconTiltLeft
                            }

                            if (NSPanelLuiEditorValidate.stringIsNotNullOrEmpty(iconTiltStop)) {
                                entity.iconTiltStop = iconTiltStop
                            }

                            if (NSPanelLuiEditorValidate.stringIsNotNullOrEmpty(iconTiltRight)) {
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

    // load templates

    $.get('resources/node-red-contrib-nspanel-lui/nspanel-lui-tpl-entitieslist.html').done((tpl) => {
        $('body').append($(tpl))
    })
    $.get('resources/node-red-contrib-nspanel-lui/nspanel-lui-tpl-eventslist.html').done((tpl) => {
        $('body').append($(tpl))
    })

    // #region API generation
    NSPanelLui['_'] = i18n

    NSPanelLui.Editor = NSPanelLui.Editor || {
        _: i18n,
        validate: {
            isNumberInRange: NSPanelLuiEditorValidate.numberInRange,
            limitNumberToRange: NSPanelLuiEditorValidate.limitNumberToRange,
            stringIsNotNullOrEmpty: NSPanelLuiEditorValidate.stringIsNotNullOrEmpty,
        },
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
