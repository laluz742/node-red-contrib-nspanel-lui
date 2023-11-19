// eslint-disable-next-line func-names
;(function ($) {
    const ALL_VALID_EVENTS_BASE: EventDescriptor[] = NSPanelLui.Events.allNavigationEvents

    const PANEL_TIMEOUT_MIN = 0
    const PANEL_TIMEOUT_MAX = 65

    const MAX_ENTITIES = 6

    let editableEventList
    let editableEntitiesList

    const registerType = () =>
        RED.nodes.registerType('nspanel-page-grid', {
            category: 'NSPanel',
            paletteLabel: NSPanelLui._('label.palette', 'nspanel-page-grid'),

            inputs: 1,
            outputs: 1,

            icon: 'font-awesome/fa-television',
            color: 'rgb( 50, 120, 190)',

            defaults: {
                name: { value: '' },
                title: { value: '' },
                nsPanel: { type: 'nspanel-panel', required: true },
                timeout: {
                    value: null,
                    required: false,
                    validate: function (v) {
                        if (v == '') return true
                        return NSPanelLui.Editor.validate.isNumberInRange(v, PANEL_TIMEOUT_MIN, PANEL_TIMEOUT_MAX)
                    },
                },
                events: { value: [] },
                entities: { value: [] },
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

                editableEntitiesList = NSPanelLui.Editor.create.editableEntitiesList(
                    this,
                    '#node-input-entities-control',
                    MAX_ENTITIES,
                    this.entities,
                    ['delete', 'shutter', 'light', 'fan', 'input_sel', 'timer', 'switch', 'number', 'button', 'text']
                )

                editableEventList = NSPanelLui.Editor.create.editableEventList(
                    self,
                    '#node-input-event-control',
                    ALL_VALID_EVENTS_BASE,
                    self.events,
                    editableEntitiesList
                )
                NSPanelLui.Interactions.addPanelChangeBehavior(
                    nsPanelInputField,
                    eventInputControl,
                    editableEventList,
                    ALL_VALID_EVENTS_BASE,
                    nsPanelInputFieldLastVal
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
                    label: NSPanelLui._('label.entities', 'nspanel-panel', 'common'),
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
