// eslint-disable-next-line func-names
;(function ($) {
    const ALL_VALID_EVENTS_BASE = NSPanelLui.Events.allNavigationEvents

    const PANEL_TIMEOUT_MIN = 0
    const PANEL_TIMEOUT_MAX = 65

    const MAX_ENTITIES = 2
    let editableEventList
    let editableEntitiesList

    const registerType = () =>
        RED.nodes.registerType('nspanel-page-qr', {
            category: 'NSPanel',
            paletteLabel: NSPanelLui._('label.palette', 'nspanel-page-qr'),

            inputs: 0,
            outputs: 1,

            icon: 'font-awesome/fa-television',
            color: 'rgb( 50, 120, 190)',

            defaults: {
                name: { value: NSPanelLui._('defaults.name', 'nspanel-page-qr') },
                title: { value: '' },
                nsPanel: { type: 'nspanel-panel', required: true },
                timeout: {
                    value: null,
                    required: false,
                    validate: (v) => {
                        if (v === '') return true
                        return NSPanelLui.Editor.validate.isNumberInRange(v, PANEL_TIMEOUT_MIN, PANEL_TIMEOUT_MAX)
                    },
                },
                events: { value: [] },
                entities: { value: [] },
                qrCode: { value: '' },
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
                    ['text']
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

                const qrCodeField = $('#node-input-qrCode')
                const wifiSSIDField = $('#nspanel-input-qrCode-ssid')
                const wifiPasswordField = $('#nspanel-input-qrCode-password')
                const wifiAuthTypeField = $('#nspanel-input-qrCode-type')
                const wifiHiddenField = $('#nspanel-input-qrCode-hidden')

                function buildWifiQrCode(): void {
                    let res = 'WIFI:'

                    const wifiSSID = wifiSSIDField.val()
                    const wifiPassword = wifiPasswordField.val()
                    const wifiAuthType = wifiAuthTypeField.val()
                    const wifiHidden = wifiHiddenField.is(':checked')

                    res += `S:${wifiSSID};`
                    res += `T:${wifiAuthType};`
                    res += `P:${wifiPassword};`
                    if (wifiHidden) {
                        res += 'H:true'
                    }

                    res += ';;'
                    qrCodeField.val(res)
                }

                wifiSSIDField.on('change', () => buildWifiQrCode())
                wifiPasswordField.on('change', () => buildWifiQrCode())
                wifiAuthTypeField.on('change', () => buildWifiQrCode())
                wifiHiddenField.on('change', () => buildWifiQrCode())

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
