# node-red-contrib-nspanel-lui

## Installation and First Steps

To install the packackage run the following command in your Node-RED installation directory
```
    npm install node-red-contrib-nspanel-lui
```

To start usign the nodes please ensure you have prepared your NSPanel as described in the NSPanel Lovelace UI documentation. For further instructions, please see section *Prepare NsPanel* of the [NsPanel Lovelace UI Docs](https://docs.nspanel.pky.eu/).

<br/>
The *Panel Controller* node is required to manage your NSPanel with Node-RED and adding your custom pages. It can be found under the NSPanel section of your node palette.

After dragging the node into your flow, please edit it to create a new NSPanel configuration node. Please use the device topic and full topic as configured on your panel in section *Configure MQTT*.
To enable communication with your panel using your MQTT server, please add a new NSPanel configuration.

## Nodes

### ScreenSaver
The screensaver node serves as a standby screen for your panel and is automatically activated after startup when the *Activate screensaver after startup* option is checked in your controller node.

It can process input messages with the topic
* *status* for status icons and
* *data* for wheater data

#### Status Icons
Status data sent using topic *status* will be displayed in the upper corners of the screen. 
```javascript
    var statusMsg = {
        topic: 'status',
        payload: [{
            icon: 'heat-wave',
            iconColor: "#fcae1e",
            text: '23.1°',
            index: 0,
            prefix: 'p'
        }]
    }
```
The message payload can be either a single object or an array of objects each providing the following data
 Key | Description
 -- | --
 `icon` | The icon to be shown
 `iconColor` | the color to be used for the icon, encoded as hex rgb string (e.g. `#rrggbb`), or rgb color string (`rgb(r,g,b)`).
 `text` | the text to show
 `index` | position (0=left, 1=right)
 `prefix` | optional, `prefix` is displayed left to the icon

 #### Wheater Data
 Messages with the topic *data* will be handled to show entities at the bottom of the screensaver screen
 ```javascript
    
    var weatherDataMsg = {
        topic: "data",
        payload: [
            {
                value: "15.0°",
                text: "",
                icon: "weather-partly-cloudy",
                iconColor: "#abcabc"
            },
            {
                value: "15°",
                text: "Today",
                icon: "weather-rainy",
                iconColor: "#abcabc"
            },
            {
                value: "17°",
                text: "Mo",
                icon: "weather-rainy",
                iconColor: "#abcabc"
            },
            {
                value: "14°",
                text: "Tue",
                icon: "weather-rainy",
                iconColor: "#abcabc"
            },
            {
                value: "7°",
                text: "Wed",
                icon: "weather-rainy",
                iconColor: "#abcabc"
            }
        ]
    }
 ```

 The message payload can be an array of up to six object
 Key | Description
 -- | --
 `text` | the text to show
 `value` | the value to be displays
  `icon` | optional, the icon to be shown
 `iconColor` | the color to be used for the icon, encoded as hex rgb string (e.g. `#rrggbb`), or rgb color string (`rgb(r,g,b)`).