# Configuration Nodes

-   [NSPanel MQTT Config](#nspanel-mqtt-config-nspanel-config)
-   [NSPanel Config](#nspanel-config)

## NSPanel MQTT Config (nspanel-config)

Configuration used for all NSPanels to connect to a MQTT broker.

### Properties

![image](img/config-node-config_mqtt.png)

-   **MQTT Server**: the address of the mqtt broker, can be prefixed with `mqtt://`, or `mqtts://` to use tls<br/>
-   **Port**: The port the mqtt broker is listening on<br/>
-   **Client Id**: Custom client id to use, otherwise auto generated<br/>
-   **Username**: the username required by your broker, if any<br/>
-   **Password**: the password required by your broker, if any<br/>
-   **Keepalive**: 60 seconds or 0 to disable<br/>

## NSPanel Config

Configuration for a specific NSPanel device.

### General

-   **Name**: Name used to identify the panel<br/>
-   **NSPanel MQTT Config**: MQTT configuration for the panel<br/>
-   **Device Topic**: device topic as configured in `Configure MQTT` section of the panel<br/>
-   **Full Topic**: full topic as configured in `Configure MQTT` section of the panel using the `%prefix%` and `%topic%` placeholder<br/>
-   **Standby timeout**: Default timeout in seconds for activating the screensaver<br/>

#### Display Brightness

Brightness settings for day and night

-   **Stand by**: Brightness for stand-by mode<br/>
-   **Active**: Brightness when using the panel<br/>
-   **Starting time**: Time of day, when to activate the brightness settings<br/>

#### Misc options

-   **Telemetry Period**: Interval in seconds for sensor update<br/>
-   **Decouple buttons from relays**: Detaches the hardware buttons from relay control, so they can be used for event mappings<br/>

### Updates

-   **Enable check for updates**: Enables checking for updates at the time configured<br/>
-   **Install new firmware automatically**: Install new updates automatically, otherwise a notification is displayed on panel<br/>
-   **Time to check for updates**: Time of day to perform update check<br/>
-   **Tasmota OTA Url**: Url to the Tasmota firmware to use<br/>

### Date & Time

-   **Language for date display**: The language for time and date localization<br/>
-   **Clock notation**: Either 12-hour or 24-hour clock notation<br/>
-   **Date and time format**: Configuration options for formatting the date and time<br/>
-   **Use custom date and time format**: Enables advanced options for customizing the formatting of date and time<br/>
