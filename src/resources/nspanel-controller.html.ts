// eslint-disable-next-line func-names
;(function (_$) {
    const registerType = () =>
        RED.nodes.registerType('nspanel-controller', {
            category: 'NSPanel',
            paletteLabel: NSPanelLui._('label.palette', 'nspanel-controller'),

            icon: 'font-awesome/fa-television',
            color: 'rgb( 50, 120, 190)',

            inputs: 1,
            outputs: 1,

            defaults: {
                name: { value: NSPanelLui._('defaults.name', 'nspanel-controller') },
                nsPanel: { value: '', type: 'nspanel-panel', required: true },
                screenSaverOnStartup: { value: true },
                beepOnNotifications: { value: false },
            },

            label() {
                return NSPanelLui.Editor.util.getNodeLabel(this)
            },

            oneditprepare() {},
        })

    $.getScript('resources/node-red-contrib-nspanel-lui/nspanel-lui.js').done(registerType)
})(jQuery)
