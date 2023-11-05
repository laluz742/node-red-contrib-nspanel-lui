# Page Nodes

## Contents

-   [General](#general)
-   [Entities Node](#2ntities-node)
-   [Grid Node](#grid-node)
-   [Thermo Node](#thermo-node)
-   [QR Node](#qr-page-node)
-   [Media Node](#media-page-node)
-   [Chart Node](#chart-page-node)

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

```json
{
    "topic": "media",
    "payload": {
        "title": "<name of title>",
        "titleColor": "<color>",
        "artist": "<name of artist>",
        "artistColor": "<color>",
        "volume": 75,
        "iconPlayPause": "pause"
    }
}
```

| Key | Description |
| --- | --- |
| `title` | optional, the text to show |
| `titleColor` | optional, the color to be used for the icon, encoded as hex rgb string (e.g. `#rrggbb`), or rgb color string (`rgb(r,g,b)`). |
| `artist` | optional, the icon to be shown |
| `artistColor` | optional, the color to be used for the icon, encoded as hex rgb string (e.g. `#rrggbb`), or rgb color string (`rgb(r,g,b)`). |
| `volume` | optional, number between 0 and 100, volume |
| `iconPlayPause` | optional, the icon to use for play/pause |

### Chart Page Node

#### Configuration

#### Messages

Example Message:

```json
{
    "topic": "data",
    "payload": {
        "values": [
            {
                "value": 10,
                "label": "Jul"
            },
            {
                "value": 20,
                "label": "Aug"
            },
            {
                "value": 30,
                "label": "Sep"
            },
            {
                "value": 40,
                "label": "Oct"
            },
            {
                "value": 50,
                "label": "Nov"
            }
        ],
        "yAxisTicks": [10, 50, 100],
        "yAxisLabel": "Amount"
    }
}
```

### Popups

#### Input Selection (_selection_ entity)

```json
{
    "topic": "data",
    "payload": {
        "entityId": "<entityId>",
        "iconColor": "<color>",
        "selectedOption": "<name of selected option>",
        "options": ["<array of strings>"]
    }
}
```

| Key | Description |
| --- | --- |
| `entityId` | id of the entity as configured in node settings |
| `iconColor` | optional, the color to be used for the icon, encoded as hex rgb string (e.g. `#rrggbb`), or rgb color string (`rgb(r,g,b)`). |
| `selectedOption` | selected option, must be included in `options` |
| `options` | available options to choose from |

#### Timer (_timer_ entity)

```json
{
    "topic": "data",
    "payload": {
        "entityId": "<entityId>",
        "timerRemainingSeconds": "<remaining time in seconds>",
        "action1": "<action1>",
        "action2": "<action2>",
        "action3": "<action3>",
        "label1": "<label for action1>",
        "label2": "<label for action2>",
        "label3": "<label for action3>"
    }
}
```

| Key | Description |
| --- | --- |
| `entityId` | id of the entity as configured in node settings |
| `iconColor` | optional, the color to be used for the icon, encoded as hex rgb string (e.g. `#rrggbb`), or rgb color string (`rgb(r,g,b)`). |
| `selectedOption` | selected option, must be included in `options` |
| `options` | available options to choose from |
