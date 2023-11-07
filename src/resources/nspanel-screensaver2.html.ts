// eslint-disable-next-line func-names
;(function ($) {
    const I18N_DICT: string = 'nspanel-panel'
    const I18N_GROUP: string = 'editor'
    const I18N_PREFIX_EVENTS: string = 'events.'

    const ALL_VALID_EVENTS_BASE: EventDescriptor[] = [
        { event: 'bExit', label: '' },
        { event: 'swipeRight', label: '' },
        { event: 'swipeLeft', label: '' },
        { event: 'swipeUp', label: '' },
        { event: 'swipeDown', label: '' },
    ]

    // eslint-disable-next-line prefer-const
    for (let i in ALL_VALID_EVENTS_BASE) {
        ALL_VALID_EVENTS_BASE[i].label = NSPanelLui.Editor._(
            `${I18N_PREFIX_EVENTS}${ALL_VALID_EVENTS_BASE[i].event}`,
            I18N_DICT,
            I18N_GROUP
        )
    }

    let editableEventList
    const registerType = () =>
        RED.nodes.registerType('nspanel-screensaver2', {
            category: 'NSPanel',
            paletteLabel: NSPanelLui._('label.palette', 'nspanel-screensaver2'),

            inputs: 1,
            outputs: 1,

            icon: 'font-awesome/fa-television',
            color: 'rgb( 50, 120, 190)',

            defaults: {
                name: { value: '' },
                nsPanel: { value: '', type: 'nspanel-panel', required: true },
                timeout: { value: null },
                events: { value: [] },

                doubleTapToExit: { value: false },
                colorBackground: { value: '#000000' },
                colorTime: { value: '#ffffff' },
                colorTimeAmPm: { value: '#ffffff' },
                colorTimeAdd: { value: '#ffffff' },
                colorDate: { value: '#ffffff' },
                colorMainText: { value: '#ffffff' },
                colorForecast1: { value: '#ffffff' },
                colorForecast2: { value: '#ffffff' },
                colorForecast3: { value: '#ffffff' },
                colorForecast4: { value: '#ffffff' },
                colorForecastVal1: { value: '#ffffff' },
                colorForecastVal2: { value: '#ffffff' },
                colorForecastVal3: { value: '#ffffff' },
                colorForecastVal4: { value: '#ffffff' },
                colorBar: { value: '#ffffff' },
                colorMainTextAlt2: { value: '#ffffff' },
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

                editableEventList = NSPanelLui.Editor.create.editableEventList(
                    self,
                    '#node-input-event-control',
                    ALL_VALID_EVENTS_BASE,
                    self.events
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
                    id: 'nspanel-page-tab-events',
                    iconClass: 'fa fa-list',
                    label: NSPanelLui._('label.events', 'nspanel-panel', 'common'),
                })
                tabs.addTab({
                    id: 'nspanel-page-tab-colors',
                    iconClass: 'fa fa-paint-brush',
                    label: NSPanelLui._('label.tabColors', 'nspanel-screensaver'),
                })
            },
            oneditsave() {
                this.events = editableEventList.getEvents() || []
            },
        })

    $.getScript('resources/node-red-contrib-nspanel-lui/nspanel-lui.js').done(registerType)
})(jQuery)
