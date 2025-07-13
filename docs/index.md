# node-red-contrib-nspanel-lui

## Installation and First Steps

To install the package either use the [_Palette Manager_](https://nodered.org/docs/user-guide/editor/palette/manager) or the npm package manager:

```
    npm install node-red-contrib-nspanel-lui
```

To start using the nodes please ensure you have prepared your NSPanel as described in the NSPanel Lovelace UI documentation. For further instructions, please see section _Prepare NsPanel_ of the [NsPanel Lovelace UI Docs](https://docs.nspanel.pky.eu/).

The _Panel Controller_ node is required to manage your NSPanel with Node-RED and adding your custom pages. It can be found under the NSPanel section of your node palette.

After dragging the node into your flow, please edit it to create a new NSPanel configuration node (nspanel-panel). Please use the device topic and full topic as configured on your panel in section _Configure MQTT_. To enable communication with your panel using your MQTT server, please add a new NSPanel MQTT configuration (nspanel-config).

## Nodes

There are different types of nodes

-   [config nodes](config-nodes.md) for configuration
-   [main nodes](./nodes.md) to establish control, default behavior in stand-by mode and navigation flow
-   [page nodes](./page-nodes.md) defining different type of cards, that the Lovelace UI incorporates

The icon set, that can be used in node configuration or in messages is based on the Material Design Icons. All supported icons are listed in the [Lovelace UI Icon Cheatsheet](https://docs.nspanel.pky.eu/icon-cheatsheet.html).
