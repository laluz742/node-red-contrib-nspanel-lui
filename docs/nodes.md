# Main Nodes Documentation

## Contents
- [Controller](#1-controller)
- [ScreenSaver Node](#2-screensaver-node)
- [HMI Control Node](#3-hmi-control-node)

Further details about the page-specific nodes representing the different types of screens / cards, see [Page Nodes](./page-nodes.md)


## 1. Controller

The controller is the basis for managing cards for the NSPanel. It integrates communication with the panel and controls the page flow.

### 1.1 Configuration
_to be added later_

### 1.2 Messages

#### 1.2.1 Relay control

The relays can be switched on or off via messages using the _cmd_ topic.

```javascript
var switchCmdMsg = {
    payload: {
        cmd: 'switch',
        params: {
            id: 0,
            on: 'off',
        },
    },
}
```

| Key      | Description                                                                                                                  |
| -------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `cmd`    | "switch" for relay control                                                                                                   |
| `params` | `id` = [`0` \| `1`]; `on` = [ `false` \| `0` \| `'0'`] to switch relay off, and [`true` \| `1` \| `'1'`] for on respectively |

#### 1.2.2 Notifications

To notify the user about special events, notifications can be displayed using the following command syntax using the _notify_ topic. Notifications will be stored in the page history, so after being closed, the last page is shown.

```javascript
    var notifyMsg = {
        topic: 'notify',
        payload: {
            notifyId: "notify.0",
            heading: "Warning",
            headingColor: "#fcae1e",
            okText: "OK",
            text: "Fan alarm of the ventilation system",
            textColor: "#ff22ff",
            fontSize: 2,
            timeout: 0,
            icon: "wrench"
            iconColor: "#22ffff"
        }
    }
```

| Key            | Description                                                                                                                |
| -------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `notifyId`     | Identifier for notification (used in history)                                                                              |
| `heading`      | title                                                                                                                      |
| `headingColor` | color for title text encoded as hex rgb string (e.g. `#rrggbb`), or rgb color string (`rgb(r,g,b)`)                        |
| `okText`       | Text for confirmation button                                                                                               |
| `text`         | the message to show                                                                                                        |
| `textColor`    | color for message text encoded as hex rgb string (e.g. `#rrggbb`), or rgb color string (`rgb(r,g,b)`)                      |
| `fontSize`     | the font size                                                                                                              |
| `timeout`      | the timeout in seconds after which the notification will disappear, 0 for no timeout                                       |
| `icon`         | optional, icon to show                                                                                                     |
| `iconColor`    | optional, the color to be used for the icon encoded as hex rgb string (e.g. `#rrggbb`), or rgb color string (`rgb(r,g,b)`) |

### 2. ScreenSaver Node

The screensaver node serves as a standby screen for your panel and is automatically activated after startup when the _Activate screensaver after startup_ option is checked in your controller node.

It can process input messages with the topic

-   _status_ for status icons and
-   _data_ for wheater data

#### 2.1 Configuration
_to be added later_

#### 2.2 Messages

##### 2.2.1 Status Icons

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
Key | Description
-- | --
`icon` | The icon to be shown
`iconColor` | the color to be used for the icon, encoded as hex rgb string (e.g. `#rrggbb`), or rgb color string (`rgb(r,g,b)`)
`text` | the text to show
`index` | position (0=left, 1=right)
`prefix` | optional, `prefix` is displayed left to the icon

##### 2.2.2 Weather Data

Messages with the topic _data_ will be handled to show entities at the bottom of the screensaver screen

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
Key | Description
-- | --
`text` | the text to show
`value` | the value to be displays
`icon` | optional, the icon to be shown
`iconColor` | the color to be used for the icon, encoded as hex rgb string (e.g. `#rrggbb`), or rgb color string (`rgb(r,g,b)`).

### 3. HMI Control Node
The HMI control node can be used to activate the page defined by a page nodes like _Entities_, _Grid_, or _Thermo_ by messages in the flow.

#### 3.1 Configuration
_to be added later_

#### 3.2 Messages
```javascript
    var hmiControlMsg = {
        payload: '<page name>'
    }
```

Key | Description
-- | --
`payload` | the name of the page node to be activated, as specified in the target node configuration


