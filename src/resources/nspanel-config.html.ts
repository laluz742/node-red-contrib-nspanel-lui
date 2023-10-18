;(function ($) {
    const registerType = () =>
        RED.nodes.registerType('nspanel-config', {
            category: 'config',

            defaults: {
                name: { value: NSPanelLui._('defaults.name', 'nspanel-config') },

                broker: { value: '', required: true },
                port: {
                    value: 1883,
                    required: true,
                    validate: RED.validators.number(),
                },
                clientId: { value: '' },
                keepAlive: { value: 60, validate: RED.validators.number() },
                useTls: { value: false },
                cleanSession: { value: false },
            },

            credentials: {
                mqttUsername: { type: 'text' },
                mqttPassword: { type: 'password' },
            },

            label() {
                return this.name || NSPanelLui._('defaults.name', 'nspanel-config')
            },

            oneditprepare() {
                if (typeof this.keepAlive === 'undefined') {
                    this.keepAlive = 60
                    $('#node-config-input-keepAlive').val(this.keepAlive)
                }
            },
        })

    $.getScript('resources/node-red-contrib-nspanel-lui/nspanel-lui.js').done(registerType)
})(jQuery)
