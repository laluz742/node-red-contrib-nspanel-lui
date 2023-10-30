# Page Nodes

## Contents

-   [General](#general)
-   [Entities Node](#2ntities-node)
-   [Grid Node](#grid-node)
-   [Thermo Node](#thermo-node)
-   [QR Node](#qr-page-node)

Further details on the main nodes like _Controller_, _ScreenSaver_, or _HMI Control_ please see the [main nodes docs](./nodes.md)

### General

The icon set, that can be used in node configuration or in messages is based on the Material Design Icons. All supported icons are listed in the [Lovelace UI Icon Cheatsheet](https://docs.nspanel.pky.eu/icon-cheatsheet.html).

#### Messages

Page item related data must be sent using the _data_ topic.
```json
{
    "topic": "data",
    "payload": {
        "entityId": "<id of entity specified in configuration>"
        // <... further data ...>
    }
}
```
Additional data must be specified depending on the entity type.


### Entities Node

#### Configuration

#### Messages

### Grid Node

#### Configuration

#### Messages

### Thermo Node

#### Configuration

#### Messages

### QR Page Node

#### Configuration

### Media Page Node

#### Configuration

#### Messages
