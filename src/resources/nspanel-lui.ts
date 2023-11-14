declare var RED // eslint-disable-line
var NSPanelLui = NSPanelLui || {} // eslint-disable-line

// #region types
type EventDescriptor = import('../types/nspanel-lui-editor').EventDescriptor
type EventMapping = import('../types/nspanel-lui-editor').EventMapping
type PanelEntity = import('../types/nspanel-lui-editor').PanelEntity
type PanelEntityListItem = import('../types/nspanel-lui-editor').PanelEntityListItem
type IPageConfig = import('../types/nspanel-lui-editor').IPageConfig
type PanelBasedConfig = import('../types/nspanel-lui-editor').PanelBasedConfig
type EventTypeAttrs = import('../types/nspanel-lui-editor').EventTypeAttrs
type PanelEntityContainer = import('../types/nspanel-lui-editor').PanelEntityContainer
type TypedInputParams = import('../types/nspanel-lui-editor').TypedInputParams
type TypedInputTypeParams = import('../types/nspanel-lui-editor').TypedInputTypeParams
type EventMappingContainer = import('../types/nspanel-lui-editor').EventMappingContainer

// #endregion types

// eslint-disable-next-line func-names, @typescript-eslint/no-shadow
;(function (RED, $) {
    if (NSPanelLui.Editor != null) return

    const I18N_DICT: string = 'nspanel-panel'
    const I18N_GROUP: string = 'editor'
    const I18N_PREFIX_EVENTS: string = 'events.'

    // #region events
    const ALL_VALID_NAVIGATION_EVENTS: EventDescriptor[] = [
        { event: 'nav.prev', label: '' },
        { event: 'nav.next', label: '' },
    ]
    const ALL_VALID_BUTTON_EVENTS: EventDescriptor[] = [
        { event: 'hw.button1', label: '' },
        { event: 'hw.button2', label: '' },
    ]

    const addHardwareButtonEventsIfApplicable = (
        nsPanelId: string,
        validEventsBase: EventDescriptor[]
    ): EventDescriptor[] => {
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
        [
            'shutter',
            { hasId: true, hasLabel: true, hasIcon: true, hasOptionalValue: false, isShutter: true, opensPopup: true },
        ],
        ['light', { hasId: true, hasLabel: true, hasIcon: true, hasOptionalValue: false, isLight: true }],
        ['fan', { hasId: true, hasLabel: true, hasIcon: true, hasOptionalValue: false, isFan: true }],
        ['input_sel', { hasId: true, hasLabel: true, hasIcon: true, hasOptionalValue: false, isInputSel: true }],
        ['timer', { hasId: true, hasLabel: true, hasIcon: true, hasOptionalValue: false, isTimer: true }],
        ['switch', { hasId: true, hasLabel: true, hasIcon: true, hasOptionalValue: false }],
        ['number', { hasId: true, hasLabel: true, hasIcon: true, hasOptionalValue: false, isNumber: true }],
        ['button', { hasId: true, hasLabel: true, hasIcon: true, hasOptionalValue: false }],
        ['text', { hasId: true, hasLabel: true, hasIcon: true, hasOptionalValue: false }],
        ['hvac_action', { hasId: true, hasLabel: false, hasIcon: true, hasOptionalValue: false }],
        ['alarm_action', { hasId: true, hasLabel: true, hasIcon: false, hasOptionalValue: false }],
    ])

    const ALL_PANEL_ENTITY_TYPES = (() => {
        const result: string[] = Array.from(PANEL_ENTITY_TYPE_ATTRS.keys())
        return result
    })()

    const DEFAULT_COLOR = '#ffffff'

    function getRandomId(): string {
        if (typeof crypto['randomUUID'] === 'function') return crypto.randomUUID()

        // TODO: downward compatibility needed?
        return new Date().getMilliseconds() + Math.floor(Math.random() * 10000).toString()
    }

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

    const i18nTpl = (rel: JQuery<HTMLElement>, dict: string, group?: string) => {
        rel.find('[data-i18n]').each((_i, el) => {
            const attr = $(el).attr('data-i18n')
            const val = i18n(attr, dict, group)
            $(el).text(val)
        })
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

    // #region widget wrapper / factories
    const InputWidgetFactory = {
        createPayloadTypedInput(field, defaultType = undefined) {
            return field.typedInput({
                default: defaultType || 'str',
                // ['msg', 'flow', 'global', 'str', 'num', 'bool', 'json', 'bin', 'env'],
                types: ['str', 'json'],
            })
        },

        createPageTypedInput(field: JQuery, defaultType: string, nodeConfig: PanelBasedConfig, panelAttr: string) {
            const currentPanel = field.val() || nodeConfig[panelAttr]
            const typedInputParams: TypedInputParams = {
                default: defaultType || 'msg',
                types: [{ value: 'msg', label: 'msg.', type: 'msg', types: ['str'] }],
            }

            if (currentPanel !== '_ADD_' && currentPanel !== '' && currentPanel != null) {
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
        },
    }

    class EditableEntitiesListWrapper extends EventTarget {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore TS6133
        private _node: IPageConfig

        private _domControl: JQuery<HTMLElement>

        private _domControlList: JQuery<HTMLElement>

        private _maxEntities: number

        private _validEntities: string[]

        private _editableListAddButton

        private _entities: Map<string, PanelEntityListItem> = new Map<string, PanelEntityListItem>()

        constructor(
            node: IPageConfig,
            domControl: JQuery<HTMLElement>,
            domControlList: JQuery<HTMLElement>,
            maxEntities: number,
            validEntities: string[] = ALL_PANEL_ENTITY_TYPES
        ) {
            super()
            this._node = node
            this._domControl = domControl
            this._domControlList = domControlList
            this._maxEntities = maxEntities
            this._validEntities = validEntities
        }

        public makeControl() {
            const self = this // eslint-disable-line
            this._domControlList?.editableList({
                addItem(container, _i, data: PanelEntityContainer) {
                    self._updateListAddButton()

                    data.element = container
                    container.css({
                        overflow: 'hidden',
                        whiteSpace: 'nowrap',
                    })

                    if (!Object.prototype.hasOwnProperty.call(data, 'entry')) {
                        data.entry = {
                            listId: null,
                            type: 'delete',
                            entityId: '',
                            iconColor: DEFAULT_COLOR,
                        }
                    }
                    const entry = data.entry as PanelEntityListItem
                    if (!Object.prototype.hasOwnProperty.call(entry, 'type')) {
                        entry.type = 'delete' // TODO: 'delete' might not be a valid entity type
                    }

                    entry.listId = getRandomId()
                    self._entities.set(entry.listId, entry)

                    // #region create DOM
                    const template = $('#nspanel-lui-tpl-entitieslist').contents().clone()
                    const tpl = $(container[0]).append($(template))
                    i18nTpl(tpl, I18N_DICT, I18N_GROUP) // TODO: run on template load from server

                    const ROW1_2 = tpl.find('.nlui-row-1-2')
                    const ROW1_3 = tpl.find('.nlui-row-1-3')
                    const rowOptionalValue = tpl.find('.nlui-row-optional-value')
                    const rowIcon = tpl.find('.nlui-row-icon').hide()
                    const rowShutter = tpl.find('.nlui-row-shutter').hide()
                    const rowShutterTiltIcons = tpl.find('.nlui-row-shutter-tilt-icons').hide()
                    const rowNumber = tpl.find('.nlui-row-number').hide()
                    const rowFanModes = tpl.find('.nlui-row-fan-modes').hide()
                    const rowLight = tpl.find('.nlui-row-light').hide()
                    const rowInputSel = tpl.find('.nlui-row-inputsel').hide()
                    const rowTimer = tpl.find('.nlui-row-timer').hide()
                    const rowTimerActions = tpl.find('.nlui-row-timer-actions').hide()
                    const rowTimerLabels = tpl.find('.nlui-row-timer-labels').hide()

                    // #region row1
                    const listIdField = tpl.find('.node-input-entity-listid')
                    const selectTypeField = tpl.find('.node-input-entity-type')

                    self._validEntities.forEach((item) => {
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

                    // #region timer
                    const timerAdjustableField = tpl.find('.node-input-entity-timer-adjustable')
                    const timerDefaultField = tpl.find('.node-input-entity-timer-default')
                    const timerAction1Field = tpl.find('.node-input-entity-timer-action1')
                    const timerAction2Field = tpl.find('.node-input-entity-timer-action2')
                    const timerAction3Field = tpl.find('.node-input-entity-timer-action3')
                    const timerLabel1Field = tpl.find('.node-input-entity-timer-label1')
                    const timerLabel2Field = tpl.find('.node-input-entity-timer-label2')
                    const timerLabel3Field = tpl.find('.node-input-entity-timer-label3')

                    // #endregion timer

                    // #endregion create DOM

                    selectTypeField.on('change', () => {
                        const typeValue = `${selectTypeField.val()}`
                        entry.type = typeValue
                        const entityTypeAttrs = PANEL_ENTITY_TYPE_ATTRS.get(typeValue)

                        if (entityTypeAttrs != null) {
                            ROW1_2.toggle(entityTypeAttrs.hasId)
                            ROW1_3.toggle(entityTypeAttrs.hasLabel)
                            rowOptionalValue.toggle(entityTypeAttrs.hasOptionalValue ?? false)
                            rowIcon.toggle(entityTypeAttrs.hasIcon ?? false)
                            rowShutter.toggle(entityTypeAttrs.isShutter ?? false)
                            rowShutterTiltIcons.toggle(entityTypeAttrs.isShutter ?? false)
                            rowNumber.toggle((entityTypeAttrs.isNumber || entityTypeAttrs.isFan) ?? false)
                            rowFanModes.toggle(entityTypeAttrs.isFan ?? false)
                            rowLight.toggle(entityTypeAttrs.isLight ?? false)
                            rowInputSel.toggle(entityTypeAttrs.isInputSel ?? false)
                            rowTimer.toggle(entityTypeAttrs.isTimer ?? false)
                            rowTimerActions.toggle(entityTypeAttrs.isTimer ?? false)
                            rowTimerLabels.toggle(entityTypeAttrs.isTimer ?? false)

                            // fan min/max number handling
                            if (entityTypeAttrs.isFan) {
                                numberMinField.val(0)
                            }
                            numberMinField.prop('disabled', entityTypeAttrs.isFan)
                        }
                        self.notifyChange(entry)
                    })

                    // #region attach observer
                    entityIdField.on('change', () => {
                        entry.entityId = entityIdField.val().toString()
                        self.notifyChange(entry)
                    })
                    entityTextField.on('change', () => {
                        entry.text = entityTextField.val().toString()
                        self.notifyChange(entry)
                    })

                    // #region update fields with entity data
                    listIdField.val(entry.listId)
                    entityIdField.val(entry.entityId)
                    entityIconField.val(entry.icon ?? '')
                    entityIconColorField.val(entry.iconColor ?? '')
                    entityTextField.val(entry.text ?? '')
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

                    // timer
                    timerAdjustableField.prop('checked', entry.adjustable ?? false)
                    timerDefaultField.val(entry.timer ?? '')
                    timerAction1Field.val(entry.action1 ?? '')
                    timerAction2Field.val(entry.action2 ?? '')
                    timerAction3Field.val(entry.action3 ?? '')
                    timerLabel1Field.val(entry.label1 ?? '')
                    timerLabel2Field.val(entry.label2 ?? '')
                    timerLabel3Field.val(entry.label3 ?? '')

                    // #endregion update fields with entity data
                    selectTypeField.val(entry.type)
                    selectTypeField.trigger('change')

                    self.notifyChange(entry, 'add')
                },

                removeItem(listItem) {
                    const entity: PanelEntityListItem = listItem.entry
                    self._entities.delete(entity.listId)
                    self._updateListAddButton()
                    self.notifyChange(entity, 'remove')
                },

                sortItems(_events) {
                    // TODO
                },

                sortable: true,
                removable: true,
            })
            self._editableListAddButton = (
                self._domControl.prop('tagName') === 'ol'
                    ? self._domControl.closest('.red-ui-editableList')
                    : self._domControl
            ).find('.red-ui-editableList-addButton')
        }

        private notifyChange(entry: PanelEntityListItem, type: string = 'change'): void {
            this.dispatchEvent(new CustomEvent(type, { detail: entry }))
        }

        public addItems(items): void {
            if (items != null && Array.isArray(items)) {
                items.forEach((item) => {
                    this._domControlList?.editableList('addItem', { entry: item })
                })
            }
        }

        public getEntities(): PanelEntityListItem[] {
            const entityItems = this._domControlList?.editableList('items')

            entityItems.each((_i, ele) => {
                let maxStr: string
                let minStr: string
                const listItem = $(ele)

                const listId = listItem.find('.node-input-entity-listid').val().toString()
                const entity = this._entities.get(listId)

                entity.type = listItem.find('.node-input-entity-type').val().toString()
                entity.entityId = listItem.find('.node-input-entity-id').val().toString()
                entity.text = listItem.find('.node-input-entity-text').val().toString()
                entity.icon = listItem.find('.node-input-entity-icon').val().toString()
                entity.iconColor = listItem.find('.node-input-entity-iconcolor').val().toString()
                const optionalValue = listItem.find('.node-input-entity-optionalvalue').val().toString()

                if (NSPanelLuiEditorValidate.stringIsNotNullOrEmpty(optionalValue)) {
                    entity.optionalValue = optionalValue
                }

                switch (entity.type) {
                    case 'shutter': {
                        const iconDown = listItem.find('.node-input-entity-shutter-icondown').val().toString()
                        const iconUp = listItem.find('.node-input-entity-shutter-iconup').val().toString()
                        const iconStop = listItem.find('.node-input-entity-shutter-iconstop').val().toString()
                        const hasTilt = listItem.find('.node-input-entity-shutter-hastilt').is(':checked')

                        const iconTiltLeft = listItem.find('.node-input-entity-shutter-icontiltleft').val().toString()
                        const iconTiltStop = listItem.find('.node-input-entity-shutter-icontiltstop').val().toString()
                        const iconTiltRight = listItem.find('.node-input-entity-shutter-icontiltright').val().toString()

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

                    case 'timer': {
                        const timerAdjustable: boolean = listItem
                            .find('.node-input-entity-timer-adjustable')
                            .is(':checked')
                        entity.adjustable = timerAdjustable
                        const action1 = listItem.find('.node-input-entity-timer-action1').val().toString()
                        const action2 = listItem.find('.node-input-entity-timer-action2').val().toString()
                        const action3 = listItem.find('.node-input-entity-timer-action3').val().toString()
                        const label1 = listItem.find('.node-input-entity-timer-label1').val().toString()
                        const label2 = listItem.find('.node-input-entity-timer-label2').val().toString()
                        const label3 = listItem.find('.node-input-entity-timer-label3').val().toString()
                        const timerDefault = Number(listItem.find('.node-input-entity-timer-default').val())

                        entity.timer = Number.isNaN(timerDefault) ? undefined : timerDefault
                        entity.action1 = action1
                        entity.action2 = action2
                        entity.action3 = action3
                        entity.label1 = label1
                        entity.label2 = label2
                        entity.label3 = label3
                        break
                    }
                }

                this._entities.set(listId, entity)
            })
            return [...this._entities.values()]
        }

        public empty(): void {
            this._domControlList?.editableList('empty')
        }

        private _updateListAddButton = () => {
            this._editableListAddButton?.prop('disabled', this._entities.size >= this._maxEntities)
        }
    }

    class EditableEventListWrapper {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore TS6133
        private _node: IPageConfig

        private _domControl: JQuery<HTMLElement>

        private _domControlList: JQuery<HTMLElement>

        private _updateLock: boolean = false

        private _editableListAddButton: JQuery<HTMLElement>

        private _pageEvents: {
            all: EventDescriptor[]
            entities: Map<string, PanelEntityListItem>
            available: string[]
            used: string[]
        } = {
            all: [],
            entities: new Map<string, PanelEntityListItem>(),
            available: [],
            used: [],
        }

        constructor(
            node: IPageConfig,
            domControl: JQuery<HTMLElement>,
            domControlList: JQuery<HTMLElement>,
            allValidEvents: EventDescriptor[]
        ) {
            this._node = node
            this._domControl = domControl
            this._domControlList = domControlList

            const allValidEventsWithHardwareButtons = NSPanelLui.Events.addHardwareButtonEventsIfApplicable(
                node.nsPanel,
                allValidEvents
            )
            this._pageEvents.all = allValidEventsWithHardwareButtons

            this._pageEvents.all.forEach((item) => this._pageEvents.available.push(item.event))
        }

        public attachToEntitiesList(entitiesList: EditableEntitiesListWrapper): void {
            if (entitiesList == null) return

            this._pageEvents.entities = new Map<string, PanelEntityListItem>()
            entitiesList.getEntities().forEach((e) => this._pageEvents.entities.set(e.listId, e))
            this._updateSelectEventFields()

            entitiesList.addEventListener('add', (e: CustomEvent) => this.onEntitiesListChanged(e))
            entitiesList.addEventListener('remove', (e: CustomEvent) => this.onEntitiesListChanged(e))
            entitiesList.addEventListener('change', (e: CustomEvent) => this.onEntitiesListChanged(e))
        }

        private onEntitiesListChanged(e: CustomEvent) {
            const entity = e.detail as PanelEntityListItem

            switch (e.type) {
                case 'remove':
                    this._pageEvents.entities.delete(entity.listId)
                    break

                case 'add':
                case 'change':
                    this._pageEvents.entities.set(entity.listId, entity)
                    break
            }

            this._updateSelectEventFields()
        }

        private _updateEditableListAddButton() {
            const disableAdd = this._pageEvents.available.length === 1
            this._editableListAddButton?.prop('disabled', disableAdd)
        }

        public makeControl(): void {
            const self = this // eslint-disable-line
            this._domControlList.editableList({
                addItem(container, _i, data: EventMappingContainer) {
                    self._updateEditableListAddButton()
                    data.element = container

                    if (!Object.prototype.hasOwnProperty.call(data, 'entry')) {
                        data.entry = { event: self._pageEvents.available[0], t: null, value: null }
                    }
                    const entry = data.entry
                    if (!Object.hasOwnProperty.call(entry, 'event')) {
                        entry.event = self._pageEvents.available[0]
                    }
                    container.css({
                        overflow: 'hidden',
                        whiteSpace: 'nowrap',
                    })

                    // #region create DOM
                    const template = $('#nspanel-lui-tpl-eventslist').contents().clone()
                    const tpl = $(container[0]).append($(template))
                    i18nTpl(tpl, I18N_DICT, I18N_GROUP) // TODO: run on template load from server

                    const eventRow2 = tpl.find('.nlui-row-2')
                    eventRow2.show()
                    const eventRow3 = tpl.find('.nlui-row-3').hide()
                    const eventRow4 = tpl.find('.nlui-row-4').hide()

                    const selectEventField = tpl.find('.node-input-event')
                    const iconField = tpl.find('.node-input-event-icon')
                    const valueField = tpl.find('.node-input-event-value')
                    const valueDataField = tpl.find('.node-input-event-data')
                    const msgTopicField = tpl.find('.node-input-event-msgTopic')

                    InputWidgetFactory.createPageTypedInput(valueField, entry.t, self._node, 'nsPanel')
                    InputWidgetFactory.createPayloadTypedInput(valueDataField)

                    // #endregion create DOM

                    // placeholder for following call to update event select fields
                    selectEventField.append($('<option />').val(entry.event ?? self._pageEvents.available[0]))

                    selectEventField.on('change', () => {
                        self._updateSelectEventFields()
                    })
                    valueField.on('change', (_event, type, _value) => {
                        const isMsgType = type === 'msg'
                        eventRow3.toggle(isMsgType)
                        eventRow4.toggle(isMsgType)
                    })

                    selectEventField.val(entry.event)
                    iconField.val(entry.icon)
                    valueField.typedInput('value', entry.value)
                    valueField.typedInput('type', entry.t)

                    valueDataField.typedInput('value', entry.data)
                    valueDataField.typedInput('type', entry.dataType)
                    msgTopicField.val(entry.msgTopic)

                    selectEventField.trigger('change')
                    valueDataField.trigger('change')

                    self._updateSelectEventFields()
                },

                removeItem(_listItem) {
                    self._updateSelectEventFields()
                    self._updateEditableListAddButton()
                },

                sortItems(_events) {
                    // TODO
                },

                sortable: true,
                removable: true,
            })
            this._editableListAddButton = (
                this._domControl.prop('tagName') === 'ol'
                    ? this._domControl.closest('.red-ui-editableList')
                    : this._domControl
            ).find('.red-ui-editableList-addButton')

            // FIXME: load entities from entitiesList
        }

        public setAvailableEvents(allValidEventSpecs: EventDescriptor[]): void {
            this._pageEvents.all = allValidEventSpecs.slice()
            this._updateSelectEventFields()
        }

        private _updateSelectEventFields(): void {
            if (this._updateLock) return

            this._updateLock = true
            const usedEvents: string[] = []
            const avaiableEvents: string[] = []
            const eventInputNode: JQuery<HTMLElement>[] = []

            this._domControl.find('.node-input-event').each((_i, ele) => {
                const v = $(ele).val() as string
                if (v) usedEvents.push(v)
                eventInputNode.push($(ele))
            })
            const allEvents = this._pageEvents.all.map((x) => x)
            this._pageEvents.entities.forEach((e) => {
                if (NSPanelLuiEditorValidate.stringIsNotNullOrEmpty(e.entityId)) {
                    const labelPrefix: string = i18n(`${I18N_PREFIX_EVENTS}entity`, I18N_DICT, I18N_GROUP) + ':'
                    const label: string = NSPanelLuiEditorValidate.stringIsNotNullOrEmpty(e.text) ? e.text : e.entityId
                    allEvents.push({ event: e.entityId, label: `${labelPrefix} ${label}` })
                }
            })

            allEvents.forEach((item) => {
                if (!usedEvents.includes(item.event)) avaiableEvents.push(item.event)
            })

            // FIXME: add entity events / update event items on removed entities
            // FIXME: update icons

            eventInputNode.forEach((inputNode) => {
                const usedVal = inputNode.val()
                inputNode.empty()
                allEvents.forEach((item) => {
                    if (!usedEvents.includes(item.event) || item.event === usedVal) {
                        $('<option/>').val(item.event).text(item.label).appendTo(inputNode)
                    }
                    inputNode.val(usedVal != null ? usedVal : inputNode.children().first().val())
                })
            })

            this._pageEvents.used = usedEvents
            this._pageEvents.available = avaiableEvents

            this._updateLock = false
        }

        public empty(): void {
            this._domControlList.editableList('empty')
        }

        public addItems(items): void {
            if (items !== undefined && Array.isArray(items)) {
                items.forEach((item) => {
                    this._domControlList.editableList('addItem', { entry: item })
                })
            }
            this._updateSelectEventFields()
        }

        public getEvents(): EventMapping[] {
            const events: EventMapping[] = []
            const eventItems = this._domControlList.editableList('items')

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
                    entry.msgTopic = listItem.find('.node-input-event-msgTopic')?.val()?.toString() ?? ''
                }
                events.push(entry)
            })

            return events
        }
    }

    const NSPanelWidgetFactory = {
        createPayloadTypedInput: InputWidgetFactory.createPayloadTypedInput,
        createPageTypedInput: InputWidgetFactory.createPageTypedInput,

        editableEntitiesList(
            node: IPageConfig,
            controlDomSelector: string,
            maxEntities: number,
            initialData: PanelEntityListItem[],
            validEntities: string[] = ALL_PANEL_ENTITY_TYPES
        ): EditableEntitiesListWrapper | null {
            const domControl = $(controlDomSelector)
            const domControlList = domControl.prop('tagName') === 'ol' ? domControl : domControl.find('ol')
            if (domControlList.length === 0) return null

            const el = new EditableEntitiesListWrapper(node, domControl, domControlList, maxEntities, validEntities)
            el.makeControl()
            el.addItems(initialData)
            return el
        },

        editableEventList(
            node: IPageConfig,
            controlDomSelector: string,
            allValidEvents: EventDescriptor[],
            initialData: PanelEntityListItem[],
            entitiesList?: EditableEntitiesListWrapper
        ): EditableEventListWrapper | null {
            const domControl = $(controlDomSelector)
            const domControlList = domControl.prop('tagName') === 'ol' ? domControl : domControl.find('ol')
            if (domControlList.length === 0) return null

            const el = new EditableEventListWrapper(node, domControl, domControlList, allValidEvents)
            el.makeControl()
            if (entitiesList != null) {
                el.attachToEntitiesList(entitiesList)
            }
            el.addItems(initialData)
            return el
        },
    }

    const NSPanelInteractions = {
        addPanelChangeBehavior(
            panelInputField: JQuery<HTMLElement>,
            eventInputControl: JQuery<HTMLElement>,
            eventList: EditableEventListWrapper,
            validEventsBase: EventDescriptor[],
            originalPanelId: string
        ): void {
            const eventListLastVal = eventList?.getEvents()
            let panelChangedFlag = false

            panelInputField.on('change', () => {
                const nsPanelId = panelInputField.val() as string

                if (nsPanelId === '_ADD_') {
                    eventInputControl.hide()
                } else {
                    if (nsPanelId !== originalPanelId) {
                        eventList.empty()
                        panelChangedFlag = true
                    } else if (panelChangedFlag === true) {
                        eventList.addItems(eventListLastVal)
                        panelChangedFlag = false
                    }

                    const allValidEvents = NSPanelLui.Events.addHardwareButtonEventsIfApplicable(
                        nsPanelId,
                        validEventsBase
                    )
                    if (eventList != null) {
                        eventList.setAvailableEvents(allValidEvents)
                    }

                    eventInputControl.show()
                }
            })
            panelInputField.trigger('change')
        },
    }

    // #endregion widget wrapper

    // load templates

    $.get('resources/node-red-contrib-nspanel-lui/nspanel-lui-tpl-entitieslist.html').done((tpl) => {
        $('body').append($(tpl))
    })
    $.get('resources/node-red-contrib-nspanel-lui/nspanel-lui-tpl-eventslist.html').done((tpl) => {
        $('body').append($(tpl))
    })

    // i18n processing // TODO: should be done when template loaded
    // eslint-disable-next-line prefer-const
    for (let i in ALL_VALID_NAVIGATION_EVENTS) {
        ALL_VALID_NAVIGATION_EVENTS[i].label = i18n(
            `${I18N_PREFIX_EVENTS}${ALL_VALID_NAVIGATION_EVENTS[i].event}`,
            I18N_DICT,
            I18N_GROUP
        )
    }
    // eslint-disable-next-line prefer-const
    for (let i in ALL_VALID_BUTTON_EVENTS) {
        ALL_VALID_BUTTON_EVENTS[i].label = i18n(
            `${I18N_PREFIX_EVENTS}${ALL_VALID_BUTTON_EVENTS[i].event}`,
            I18N_DICT,
            I18N_GROUP
        )
    }

    // #region API generation
    NSPanelLui['_'] = i18n

    NSPanelLui.Editor = NSPanelLui.Editor || {
        _: i18n,
        validate: {
            isNumberInRange: NSPanelLuiEditorValidate.numberInRange,
            limitNumberToRange: NSPanelLuiEditorValidate.limitNumberToRange,
            stringIsNotNullOrEmpty: NSPanelLuiEditorValidate.stringIsNotNullOrEmpty,
        },
        create: NSPanelWidgetFactory,
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
    NSPanelLui.Entities = NSPanelLui.Entities || {
        allEntityTypes: ALL_PANEL_ENTITY_TYPES,
    }
    NSPanelLui.Interactions = NSPanelLui.Interactions || NSPanelInteractions

    // #endregion API generation
})(RED, jQuery)
