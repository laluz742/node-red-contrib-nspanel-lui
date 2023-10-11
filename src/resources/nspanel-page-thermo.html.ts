;(function ($) {
    const MAX_ENTITIES = 8
    const ALLOWED_ENTITIES = ['delete', 'hvac_action']
    const ALL_VALID_EVENTS_BASE: ValidEventSpec[] = NSPanelLui.Events.allNavigationEvents

    var editableEventList = null,
        editableEntitiesList = null

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
                    validate: function (v) {
                        var vNum = Number(v)
                        if (isNaN(vNum) === true) return false

                        var minLimit = Number($('#node-input-minHeatSetpointLimit').val())
                        var maxLimit = Number($('#node-input-maxHeatSetpointLimit').val())
                        if (isNaN(minLimit) && isNaN(maxLimit)) {
                            return true
                        } else if (isNaN(minLimit) && !isNaN(maxLimit)) {
                            return vNum <= maxLimit
                        } else if (!isNaN(minLimit) && isNaN(maxLimit)) {
                            return vNum >= minLimit
                        }

                        return NSPanelLui.Editor.validate.isNumberInRange(v, minLimit, maxLimit)
                    },
                },
                minHeatSetpointLimit: {
                    value: 7,
                    required: true,
                    validate: function (v) {
                        var vNum = Number(v)
                        if (isNaN(vNum) === true) return false

                        var targetTemp = Number($('#node-input-targetTemperature').val())
                        var maxLimit = Number($('#node-input-maxHeatSetpointLimit').val())
                        return isNaN(targetTemp) === false
                            ? vNum <= targetTemp && (isNaN(maxLimit) ? true : vNum < maxLimit)
                            : true
                    },
                },
                maxHeatSetpointLimit: {
                    value: 30,
                    required: true,
                    validate: function (v) {
                        var vNum = Number(v)
                        if (isNaN(vNum) === true) return false

                        var targetTemp = Number($('#node-input-targetTemperature').val())
                        var minLimit = Number($('#node-input-minHeatSetpointLimit').val())
                        return isNaN(targetTemp) === false
                            ? vNum >= targetTemp && (isNaN(minLimit) ? true : vNum > minLimit)
                            : true
                    },
                },
                temperatureSteps: { value: '0.1', required: true, validate: RED.validators.number() },
                temperatureUnit: { value: 'C', required: true },
            },

            label: function () {
                return NSPanelLui.Editor.util.getNodeLabel(this)
            },

            oneditprepare: function () {
                //@ts-ignore 6133
                var self = this
                var eventInputControl = $('#node-input-event-control')
                var nsPanelInputField = $('#node-input-nsPanel')
                var nsPanelInputField_lastVal = this.nsPanel

                //TODO: refactor since code same on any page node
                nsPanelInputField.on('change', function () {
                    if (nsPanelInputField.val() == '_ADD_') {
                        eventInputControl.hide()
                        //TODO remove all events? ... keep track of original nsPanelId
                    } else {
                        if (nsPanelInputField.val() != nsPanelInputField_lastVal) eventInputControl.empty()

                        var nsPanelId = nsPanelInputField.val() as string
                        var allValidEvents = NSPanelLui.Events.addHardwareButtonEventsIfApplicable(
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
                    this,
                    '#node-input-entities-control',
                    MAX_ENTITIES,
                    this.entities,
                    ALLOWED_ENTITIES
                )

                editableEventList = NSPanelLui.Editor.create.editableEventList(
                    self,
                    '#node-input-event-control',
                    ALL_VALID_EVENTS_BASE,
                    self.events
                )

                var tabs = RED.tabs.create({
                    id: 'nspanel-page-tabs',
                    onchange: function (tab) {
                        $('#nspanel-page-tabs-content').children().hide()
                        $('#' + tab.id).show()
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
            oneditsave: function () {
                this.events = editableEventList.getEvents() || []
                this.entities = editableEntitiesList.getEntities() || []

                if (!NSPanelLui.Editor.validate.stringIsNotNullOrEmpty(this.timeout)) {
                    this.timeout = undefined
                }
            },
        })

    $.getScript('resources/node-red-contrib-nspanel-lui/nspanel-lui.js').done(registerType)
})(jQuery)
