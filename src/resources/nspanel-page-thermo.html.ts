// eslint-disable-next-line func-names
;(function ($) {
    const MAX_ENTITIES = 8
    const ALLOWED_ENTITIES = ['delete', 'hvac_action']
    const ALL_VALID_EVENTS_BASE: ValidEventSpec[] = NSPanelLui.Events.allNavigationEvents

    let editableEventList = null
    let editableEntitiesList = null

    const registerType = () =>
        RED.nodes.registerType('nspanel-page-thermo', {
            category: 'NSPanel',
            paletteLabel: NSPanelLui._('label.palette', 'nspanel-page-thermo'),

            inputs: 1,
            outputs: 1,

            icon: 'font-awesome/fa-television',
            color: 'rgb( 50, 120, 190)',

            defaults: {
                name: { value: '' },
                title: { value: '' },
                nsPanel: { type: 'nspanel-panel', required: true },
                timeout: { value: null },
                events: { value: [] },
                entities: { value: [] },
                useOwnTempSensor: { value: true },
                showDetailsPopup: { value: false },
                currentTemperatureLabel: { value: '' },
                statusLabel: { value: '' },
                targetTemperature: {
                    value: 25,
                    required: true,
                    validate(v) {
                        const vNum = Number(v)
                        if (Number.isNaN(vNum) === true) return false

                        const minLimit = Number($('#node-input-minHeatSetpointLimit').val())
                        const maxLimit = Number($('#node-input-maxHeatSetpointLimit').val())

                        let result: boolean
                        if (Number.isNaN(minLimit) && Number.isNaN(maxLimit)) {
                            result = true
                        } else if (Number.isNaN(minLimit) && !Number.isNaN(maxLimit)) {
                            result = vNum <= maxLimit
                        } else if (!Number.isNaN(minLimit) && Number.isNaN(maxLimit)) {
                            result = vNum >= minLimit
                        } else {
                            result = NSPanelLui.Editor.validate.isNumberInRange(v, minLimit, maxLimit)
                        }

                        return result
                    },
                },
                minHeatSetpointLimit: {
                    value: 7,
                    required: true,
                    validate(v) {
                        const vNum = Number(v)
                        if (Number.isNaN(vNum) === true) return false

                        const targetTemp = Number($('#node-input-targetTemperature').val())
                        const maxLimit = Number($('#node-input-maxHeatSetpointLimit').val())
                        const result =
                            Number.isNaN(targetTemp) === false
                                ? vNum <= targetTemp && (Number.isNaN(maxLimit) ? true : vNum < maxLimit)
                                : true

                        return result
                    },
                },
                maxHeatSetpointLimit: {
                    value: 30,
                    required: true,
                    validate(v) {
                        const vNum = Number(v)
                        if (Number.isNaN(vNum) === true) return false

                        const targetTemp = Number($('#node-input-targetTemperature').val())
                        const minLimit = Number($('#node-input-minHeatSetpointLimit').val())
                        const result =
                            Number.isNaN(targetTemp) === false
                                ? vNum >= targetTemp && (Number.isNaN(minLimit) ? true : vNum > minLimit)
                                : true

                        return result
                    },
                },
                temperatureSteps: { value: '0.1', required: true, validate: RED.validators.number() },
                temperatureUnit: { value: 'C', required: true },
            },

            label() {
                return NSPanelLui.Editor.util.getNodeLabel(this)
            },

            oneditprepare() {
                // eslint-disable-next-line @typescript-eslint/no-this-alias
                const self = this
                const eventInputControl = $('#node-input-event-control')
                const nsPanelInputField = $('#node-input-nsPanel')
                const nsPanelInputFieldLastVal = this.nsPanel

                // TODO: refactor since code same on any page node
                nsPanelInputField.on('change', () => {
                    if (nsPanelInputField.val() === '_ADD_') {
                        eventInputControl.hide()
                        // TODO remove all events? ... keep track of original nsPanelId
                    } else {
                        if (nsPanelInputField.val() !== nsPanelInputFieldLastVal) eventInputControl.empty()

                        const nsPanelId = nsPanelInputField.val() as string
                        const allValidEvents = NSPanelLui.Events.addHardwareButtonEventsIfApplicable(
                            nsPanelId,
                            ALL_VALID_EVENTS_BASE
                        )
                        if (
                            editableEventList != null &&
                            Object.prototype.hasOwnProperty.call(editableEventList, 'setAvailableEvents')
                        ) {
                            editableEventList.setAvailableEvents(allValidEvents)
                        }

                        eventInputControl.show()
                    }
                })
                nsPanelInputField.trigger('change')

                editableEntitiesList = NSPanelLui.Editor.create.editableEntitiesList(
                    self,
                    '#node-input-entities-control',
                    MAX_ENTITIES,
                    self.entities,
                    ALLOWED_ENTITIES
                )

                editableEventList = NSPanelLui.Editor.create.editableEventList(
                    self,
                    '#node-input-event-control',
                    ALL_VALID_EVENTS_BASE,
                    self.events
                )

                const tabs = RED.tabs.create({
                    id: 'nspanel-page-tabs',
                    onchange(tab) {
                        $('#nspanel-page-tabs-content').children().hide()
                        $(`#${tab.id}`).show()
                    },
                })
                tabs.addTab({
                    id: 'nspanel-page-tab-general',
                    iconClass: 'fa fa-cog',
                    label: NSPanelLui._('label.general', 'nspanel-panel', 'common'),
                })
                tabs.addTab({
                    id: 'nspanel-page-tab-entities',
                    iconClass: 'fa fa-list',
                    label: NSPanelLui._('label.actions', 'nspanel-page-thermo'),
                })

                tabs.addTab({
                    id: 'nspanel-page-tab-events',
                    iconClass: 'fa fa-list',
                    label: NSPanelLui._('label.events', 'nspanel-panel', 'common'),
                })
            },
            oneditsave() {
                this.events = editableEventList.getEvents() || []
                this.entities = editableEntitiesList.getEntities() || []

                if (!NSPanelLui.Editor.validate.stringIsNotNullOrEmpty(this.timeout)) {
                    this.timeout = undefined
                }
            },
        })

    $.getScript('resources/node-red-contrib-nspanel-lui/nspanel-lui.js').done(registerType)
})(jQuery)
