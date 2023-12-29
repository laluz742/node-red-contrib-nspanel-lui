// eslint-disable-next-line func-names
;(function ($) {
    const registerType = () =>
        RED.nodes.registerType('nspanel-weather-adapter', {
            category: 'NSPanel',
            paletteLabel: NSPanelLui._('label.palette', 'nspanel-weather-adapter'),

            inputs: 1,
            outputs: 1,

            icon: 'font-awesome/fa-cloud',
            color: 'rgb( 50, 120, 190)',

            defaults: {
                name: { value: '' },
                weatherSource: { value: 'owm', required: true },
                includeCurrentWeather: { value: true },
                numberOfForecasts: { value: 4 },
                forecastTitle: { value: 'weekday' },
                forecastTitleToday: { value: '' },
                forecastTitleCustomFormat: { value: '' },
                dateLanguage: { value: '' },
            },

            label() {
                return NSPanelLui.Editor.util.getNodeLabel(this, true)
            },

            oneditprepare() {
                $('#node-input-forecastTitle').on('change', () => {
                    const optionVal = $('#node-input-forecastTitle').val()?.toString()
                    $('#nspanel-option-forecastTitleCustomFormat').toggle(optionVal === 'custom')
                })
            },
            oneditsave() {},
        })

    $.getScript('resources/node-red-contrib-nspanel-lui/nspanel-lui.js').done(registerType)
})(jQuery)
