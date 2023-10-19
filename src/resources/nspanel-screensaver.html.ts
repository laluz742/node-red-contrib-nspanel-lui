// eslint-disable-next-line func-names
;(function ($) {
    const ALL_VALID_EVENTS_BASE: ValidEventSpec[] = [
        // TODO: i18n
        { event: 'bExit', label: 'bExit' },
        { event: 'swipeRight', label: 'swipeRight' },
        { event: 'swipeLeft', label: 'swipeLeft' },
        { event: 'swipeUp', label: 'swipeUp' },
        { event: 'swipeDown', label: 'swipeDown' },
    ]

    let editableEventList
    const registerType = () =>
        RED.nodes.registerType('nspanel-screensaver', {
            category: 'NSPanel',
            paletteLabel: NSPanelLui._('label.palette', 'nspanel-screensaver'),

            inputs: 1,
            outputs: 1,

            icon: 'font-awesome/fa-television',
            color: 'rgb( 50, 120, 190)',

            defaults: {
                name: { value: '' },
                nsPanel: { value: '', type: 'nspanel-panel', required: true },
                doubleTapToExit: { value: false },
                timeout: { value: null },

                events: { value: [] },
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
                        editableEventList?.setAvailableEvents(allValidEvents)

                        eventInputControl.show()
                    }
                })
                nsPanelInputField.trigger('change')

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
                    id: 'nspanel-page-tab-events',
                    iconClass: 'fa fa-list',
                    label: NSPanelLui._('label.events', 'nspanel-panel', 'common'),
                })
            },
            oneditsave() {
                this.events = editableEventList.getEvents() || []
            },
        })

    $.getScript('resources/node-red-contrib-nspanel-lui/nspanel-lui.js').done(registerType)
})(jQuery)
