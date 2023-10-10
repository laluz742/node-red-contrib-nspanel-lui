;(function ($) {
    RED.nodes.registerType('nspanel-hmi-control', {
        category: 'NSPanel',
        paletteLabel: NSPanelLui._('label.palette', 'nspanel-hmi-control'),

        inputs: 1,
        outputs: 1,

        icon: 'font-awesome/fa-television',
        color: 'rgb( 50, 120, 190)',

        defaults: {
            name: { value: '' },
            nsPanel: { type: 'nspanel-panel', required: true },
        },

        label: function () {
            return NSPanelLui.Editor.util.getNodeLabel(this)
        },

        oneditprepare: function () {},
        oneditsave: function () {},
    })
})(jQuery)
