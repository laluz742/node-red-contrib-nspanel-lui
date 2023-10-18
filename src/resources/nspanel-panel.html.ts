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
                autoUpdate: { value: false },
                telePeriod: {
                    value: 1,
                    required: false,
                    validate: (v) =>
                        v === 0 || // disable
                        v === 1 || // firmware default
                        NSPanelLui.Editor.validate.isNumberInRange(v, PANEL_TELEPERIOD_MIN, PANEL_TELEPERIOD_MAX),
                },

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
            },

            label() {
                return this.name || NSPanelLui._('defaults.name', 'nspanel-panel')
            },

            oneditprepare() {
                $('#node-config-input-panelDimLowStartTime').val(this.panelDimLowStartTime)
                $('#node-config-input-panelDimLowNightStartTime').val(this.panelDimLowNightStartTime)
            },
        })

    $.getScript('resources/node-red-contrib-nspanel-lui/nspanel-lui.js').done(registerType)
})(jQuery)
