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
                numberOfForecasts: {
                    value: 5,
                    validate(v) {
                        const vNum = Number(v)
                        if (Number.isNaN(vNum) === true) return false

                        const result = NSPanelLui.Editor.validate.isNumberInRange(v, 0, 8)
                        return result
                    },
                },
                forecastTitle: { value: 'weekday' },
                forecastTitleToday: { value: '' },
                forecastTitleCustomFormat: { value: '' },
                forecastTemperatureDigits: {
                    value: 1,
                    validate(v) {
                        const vNum = Number(v)
                        if (Number.isNaN(vNum) === true) return false

                        const result = NSPanelLui.Editor.validate.isNumberInRange(v, 0, 2)
                        return result
                    },
                },
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
