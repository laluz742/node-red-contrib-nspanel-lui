# Main Nodes Documentation

## Contents

-   [Panel Controller](#controller)
-   [ScreenSaver Node](#screensaver-node)
-   [ScreenSaver Extended Node](#screensaver-extended-node)
-   [HMI Control Node](#hmi-control-node)

Further details about the page-specific nodes representing the different types of screens / cards, see [Page Nodes](./page-nodes.md)

## Panel Controller

The controller is the base node for controlling the panel. It integrates the communication with the panel and controls the page flow.

### Messages

#### Switch Relay

The relays can be switched on or off via messages using the _cmd_ topic.

```javascript
var switchCmdMsg = {
    topic: 'cmd'
    payload: {
        cmd: 'switch',
        params: {
            id: 0,
            on: 'off',
        },
    },
}
```

| Key | Description |
| --- | --- |
| `cmd` | "switch" for relay control |
| `params` | `id` = [`0` \| `1`]; `on` [ `false` \| `0` \| `'0'`] to switch relay off, and [`true` \| `1` \| `'1'`] for on respectively |

#### Toggle Relay

The relays can be toggled using the _cmd_ topic.

```javascript
var switchCmdMsg = {
    topic: 'cmd'
    payload: {
        cmd: 'toggle',
        params: {
            id: 0,
        },
    },
}
```

| Key      | Description         |
| -------- | ------------------- |
| `cmd`    | "toggle"            |
| `params` | `id` = [`0` \| `1`] |

#### Notifications

To notify the user about special events, notifications can be displayed using the following command syntax using the _notify_ topic. Notifications will be stored in the page history, so after being closed, the last page is shown.

```javascript
var notifyMsg = {
    topic: 'notify',
    payload: {
        notifyId: 'notify.0',
        heading: 'Warning',
        headingColor: '#fcae1e',
        okText: 'OK',
        text: 'Fan alarm of the ventilation system',
        textColor: '#ff22ff',
        fontSize: 2,
        timeout: 0,
        icon: 'wrench',
        iconColor: '#22ffff',
        beep: 1,
    },
}
```

| Key            | Description                                                                            |
| -------------- | -------------------------------------------------------------------------------------- |
| `notifyId`     | Identifier for notification (used in history)                                          |
| `heading`      | title                                                                                  |
| `headingColor` | color for title text (`#rrggbb`, or `rgb(r,g,b)`)                                      |
| `okText`       | Text for confirmation button                                                           |
| `text`         | the message to show                                                                    |
| `textColor`    | color for message text (`#rrggbb`, or `rgb(r,g,b)`)                                    |
| `fontSize`     | the font size                                                                          |
| `timeout`      | the timeout in seconds after which the notification will disappear, `0` for no timeout |
| `icon`         | optional, icon to show                                                                 |
| `iconColor`    | optional, the color to be used for the icon (`#rrggbb`, or `rgb(r,g,b)`)               |
| `beep`         | plays sound on panel, when [`true` \| `1` \| `'1'`]                                    |

#### Buzzer

To output sound patterns on the NSPanel, the command `beep` command can be used under the _cmd_ topic

```javascript
var buzzerCommand = {
    topic: 'cmd',
    payload: {
        cmd: 'beep',
        params: {
            count: 3,
            beepDuration: 2,
            silenceDuration: 1,
            tune: 0xf54,
        },
    },
}
```

| Key               | Description                                                               |
| ----------------- | ------------------------------------------------------------------------- |
| `count`           | number of beeps, defaults to 1                                            |
| `beepDuration`    | duration of one beep in 100ms, defaults to 1                              |
| `silenceDuration` | duration of silence in 100ms, defaults to 1                               |
| `tune`            | 32bit bitmask of beep and silence according to previous duration settings |

For further details, see [Tasmota Buzzer Command](https://tasmota.github.io/docs/Buzzer/#buzzer-command) description.

#### Check for Updates

To initiate the check for firmware or driver updates, send a message under the topic _cmd_ use the command `checkForUpdates`.

```javascript
var checkForUpdatesMsg = {
    topic: 'cmd',
    payload: {
        cmd: 'checkForUpdates',
    },
}
```

## ScreenSaver Node

The screensaver node serves as a standby screen for your panel and is automatically activated after startup when the _Activate screensaver after startup_ option is checked in your controller node.

It can process input messages with the topic

-   _status_ for status icons and
-   _data_ for wheater data
-   _notify_ for notifications

### Configuration

### Messages

#### Status Icons

Status data sent using topic _status_ will be displayed in the upper corners of the screen.

```javascript
var statusMsg = {
    topic: 'status',
    payload: [
        {
            icon: 'heat-wave',
            iconColor: '#fcae1e',
            text: '23.1°',
            index: 0,
            prefix: 'p',
        },
    ],
}
```

The message payload can be either a single object or an array of objects each providing the following data

| Key         | Description                                                    |
| ----------- | -------------------------------------------------------------- |
| `icon`      | The icon to be shown                                           |
| `iconColor` | the color to be used for the icon (`#rrggbb`, or `rgb(r,g,b)`) |
| `text`      | the text to show                                               |
| `index`     | position (0=left, 1=right)                                     |
| `prefix`    | optional, `prefix` is displayed left to the icon               |

#### Weather Data

Data sent with the topic _data_ will be displayed at the bottom of the screensaver.

```javascript
var weatherDataMsg = {
    topic: 'data',
    payload: [
        {
            value: '15.0°',
            text: '',
            icon: 'weather-partly-cloudy',
            iconColor: '#abcabc',
        },
        {
            value: '15°',
            text: 'Today',
            icon: 'weather-rainy',
            iconColor: '#abcabc',
        },
        {
            value: '17°',
            text: 'Mo',
            icon: 'weather-rainy',
            iconColor: '#abcabc',
        },
        {
            value: '14°',
            text: 'Tue',
            icon: 'weather-rainy',
            iconColor: '#abcabc',
        },
        {
            value: '7°',
            text: 'Wed',
            icon: 'weather-rainy',
            iconColor: '#abcabc',
        },
    ],
}
```

The message payload can be an array of up to six object

| Key         | Description                                                    |
| ----------- | -------------------------------------------------------------- |
| `text`      | the text to show                                               |
| `value`     | the value to be displays                                       |
| `icon`      | optional, the icon to be shown                                 |
| `iconColor` | the color to be used for the icon (`#rrggbb`, or `rgb(r,g,b)`) |

#### Notifications

The screensaver can display notifications instead of weather data. Messages must use the _notify_ topic for this. Notifications will not be stored in the history, so after being closed, wheather data will be shown again.

```javascript
var notifyMsg = {
    topic: 'notify',
    payload: {
        heading: 'Warning',
        headingColor: '#fcae1e',
        text: 'Fan alarm of the ventilation system',
        textColor: '#ff22ff',
    },
}
```

| Key            | Description                                                   |
| -------------- | ------------------------------------------------------------- |
| `heading`      | title                                                         |
| `headingColor` | optional, color for title text (`#rrggbb`, or `rgb(r,g,b)`)   |
| `text`         | optional, the message to show                                 |
| `textColor`    | optional, color for message text (`#rrggbb`, or `rgb(r,g,b)`) |

## ScreenSaver Extended Node

The ScreenSaver Extended node behaves is screensaver and its behaviour similiar to [ScreenSaver Node](#screensaver-node).

It can process input messages with the topic

-   _status_ for 2 status icons at bottom of screen
-   _status2_ for extended status data
-   _data_ for wheater data

### Configuration

### Messages

#### Status Icons

Status data sent using topic _status_ will be displayed at the bottom of the screen.

```javascript
var statusMsg = {
    topic: 'status',
    payload: [
        {
            icon: 'heat-wave',
            iconColor: '#fcae1e',
            text: '23.1°',
            index: 0,
            prefix: 'p',
        },
    ],
}
```

The message payload can be either a single object or an array of objects each providing the following data

| Key         | Description                                                    |
| ----------- | -------------------------------------------------------------- |
| `icon`      | The icon to be shown                                           |
| `iconColor` | the color to be used for the icon (`#rrggbb`, or `rgb(r,g,b)`) |
| `text`      | the text to show                                               |
| `index`     | position (0=left, 1=right)                                     |
| `prefix`    | optional, `prefix` is displayed left to the icon               |

#### Extended Status Icons

Status data sent using topic _status2_ will be displayed at different positions on the screen:

```javascript
var statusMsg = {
    topic: 'status',
    payload: [
        {
            icon: 'heat-wave',
            iconColor: '#fcae1e',
            text: '23.1°',
            index: 0,
            prefix: 'p',
        },
    ],
}
```

The message payload can be either a single object or an array of objects each providing the following data

| Key         | Description                                                    |
| ----------- | -------------------------------------------------------------- |
| `icon`      | The icon to be shown                                           |
| `iconColor` | the color to be used for the icon (`#rrggbb`, or `rgb(r,g,b)`) |
| `text`      | the text to show                                               |
| `index`     | position (0=left, 1=right)                                     |
| `prefix`    | optional, `prefix` is displayed left to the icon               |

| Index      | Position                              |
| ---------- | ------------------------------------- |
| `0`        | upper left corner, thus main status   |
| `1` to `5` | below time and date                   |
| `6` to `8` | left side of screen below main status |

#### Weather Data

Messages with the topic _data_ will be handled to show up to six entities at the bottom of the screensaver screen

```javascript
var weatherDataMsg = {
    topic: 'data',
    payload: [
        {
            value: '15.0°',
            text: 'Now',
            icon: 'weather-partly-cloudy',
            iconColor: '#abcabc',
        },
        {
            value: '15°',
            text: 'Today',
            icon: 'weather-rainy',
            iconColor: '#abcabc',
        },
        {
            value: '17°',
            text: 'Mo',
            icon: 'weather-rainy',
            iconColor: '#abcabc',
        },
        {
            value: '14°',
            text: 'Tue',
            icon: 'weather-rainy',
            iconColor: '#abcabc',
        },
        {
            value: '7°',
            text: 'Wed',
            icon: 'weather-rainy',
            iconColor: '#abcabc',
        },
        {
            value: '12°',
            text: 'Thu',
            icon: 'weather-rainy',
            iconColor: '#abcabc',
        },
    ],
}
```

The message payload can be an array of up to six object

| Key         | Description                                                    |
| ----------- | -------------------------------------------------------------- |
| `text`      | the text to show                                               |
| `value`     | the value to be displays                                       |
| `icon`      | optional, the icon to be shown                                 |
| `iconColor` | the color to be used for the icon (`#rrggbb`, or `rgb(r,g,b)`) |

## HMI Control Node

The HMI control node can be used to activate the page defined by a page nodes like _Entities_, _Grid_, or _Thermo_ by messages in the flow.

### Configuration

### Messages

```javascript
var hmiControlMsg = {
    topic: 'nav',
    payload: '<page name>',
}
```

| Key       | Description                                                                              |
| --------- | ---------------------------------------------------------------------------------------- |
| `payload` | the name of the page node to be activated, as specified in the target node configuration |
