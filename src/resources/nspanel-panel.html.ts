// eslint-disable-next-line func-names
;(function ($) {
    const PANEL_DIMVALUE_MIN = 0
    const PANEL_DIMVALUE_MAX = 100
    const PANEL_TIMEOUT_MIN = 0
    const PANEL_TIMEOUT_MAX = 65
    const PANEL_TELEPERIOD_MIN = 10
    const PANEL_TELEPERIOD_MAX = 3600

    const registerType = () =>
        RED.nodes.registerType('nspanel-panel', {
            category: 'config',
            paletteLabel: NSPanelLui._('label.palette', 'nspanel-panel'),

            icon: 'font-awesome/fa-television',
            color: 'rgb( 50, 120, 190)',

            inputs: 1,
            outputs: 1,

            defaults: {
                name: { value: NSPanelLui._('defaults.name', 'nspanel-panel') },
                topic: { value: '', required: true },
                fullTopic: { value: '', required: true },

                nsPanelConfig: { value: '', type: 'nspanel-config', required: true },
                detachRelays: { value: false },
                enableUpdates: { value: true },
                autoUpdate: { value: false },
                timeToCheckForUpdates: { value: '04:00' },
                tasmotaOtaUrl: { value: 'http://ota.tasmota.com/tasmota32/release/tasmota32.bin' },
                telePeriod: {
                    value: 1,
                    required: false,
                    validate(v) {
                        const vNum = Number(v)
                        if (Number.isNaN(vNum)) return false

                        return (
                            vNum === 0 || // disable
                            vNum === 1 || // firmware default ) {
                            NSPanelLui.Editor.validate.isNumberInRange(v, PANEL_TELEPERIOD_MIN, PANEL_TELEPERIOD_MAX)
                        )
                    },
                },

                panelType: { value: 'eu', required: true },
                panelTimeout: {
                    value: 10,
                    required: true,
                    validate: (v) =>
                        NSPanelLui.Editor.validate.isNumberInRange(v, PANEL_TIMEOUT_MIN, PANEL_TIMEOUT_MAX),
                },
                panelDimLow: {
                    value: 10,
                    required: true,
                    validate: (v) =>
                        NSPanelLui.Editor.validate.isNumberInRange(v, PANEL_DIMVALUE_MIN, PANEL_DIMVALUE_MAX),
                },
                panelDimLowNight: {
                    value: 10,
                    required: true,
                    validate: (v) =>
                        NSPanelLui.Editor.validate.isNumberInRange(v, PANEL_DIMVALUE_MIN, PANEL_DIMVALUE_MAX),
                },
                panelDimLowStartTime: {
                    value: '07:00',
                },
                panelDimLowNightStartTime: {
                    value: '22:00',
                },
                panelDimHigh: {
                    value: 100,
                    required: true,
                    validate: (v) =>
                        NSPanelLui.Editor.validate.isNumberInRange(v, PANEL_DIMVALUE_MIN, PANEL_DIMVALUE_MAX),
                },
                panelDimHighNight: {
                    value: 40,
                    required: true,
                    validate: (v) =>
                        NSPanelLui.Editor.validate.isNumberInRange(v, PANEL_DIMVALUE_MIN, PANEL_DIMVALUE_MAX),
                },

                dateLanguage: { value: '' },
                dateFormatWeekday: { value: 'long' },
                dateFormatDay: { value: 'numeric' },
                dateFormatMonth: { value: 'long' },
                dateFormatYear: { value: 'numeric' },
                timeFormatTimeNotation: { value: '24', required: true },
                timeFormatHour: { value: 'numeric' },
                timeFormatMinute: { value: '2-digit' },
                timeFormatShowAmPm: { value: false },

                useCustomDateTimeFormat: { value: false },
                dateCustomFormat: { value: '' },
                timeCustomFormat: { value: 'HH:mm' },
            },

            label() {
                return this.name || NSPanelLui._('defaults.name', 'nspanel-panel')
            },

            oneditprepare() {
                $('#node-config-input-panelDimLowStartTime').val(this.panelDimLowStartTime)
                $('#node-config-input-panelDimLowNightStartTime').val(this.panelDimLowNightStartTime)
                $('#node-config-input-timeToCheckForUpdates').val(this.timeToCheckForUpdates)

                const enableUpdatesField = $('#node-config-input-enableUpdates')
                enableUpdatesField.on('change', () => {
                    const disable = enableUpdatesField.is(':checked') === false
                    $('#updateSettings input').prop('disabled', disable)
                })

                const useCustomDateTimeFormat = $('#node-config-input-useCustomDateTimeFormat')
                useCustomDateTimeFormat.on('change', () => {
                    const useCustom = useCustomDateTimeFormat.is(':checked') === true
                    $('#nspanel-page-tab-date-standard select').prop('disabled', useCustom)
                    $('#nspanel-page-tab-date-custom input').prop('disabled', !useCustom)
                })
                useCustomDateTimeFormat.trigger('change')
                // FIXME: sort lang options by text

                const timeFormatTimeNotationField = $('#node-config-input-timeFormatTimeNotation')
                timeFormatTimeNotationField.on('change', () => {
                    $('#timeFormatShowAmPmOption').toggle(timeFormatTimeNotationField.val() === '12')
                })

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
                    id: 'nspanel-page-tab-update',
                    iconClass: 'fa fa-refresh',
                    label: NSPanelLui._('label.update', 'nspanel-panel', 'common'),
                })

                tabs.addTab({
                    id: 'nspanel-page-tab-date',
                    iconClass: 'fa fa-calendar',
                    label: NSPanelLui._('label.date-time', 'nspanel-panel', 'common'),
                })
            },
        })

    $.getScript('resources/node-red-contrib-nspanel-lui/nspanel-lui.js').done(registerType)
})(jQuery)
