# Outbound Messages Documentation

-   [Outbound Messages Documentation](#outbound-messages-documentation)
    -   [General](#general)
    -   [Hardware topic](#hardware-topic)
    -   [Sensor topic](#sensor-topic)
    -   [Event topic](#event-topic)

## General

Each incoming message is forwarded to the output of the node.

## Hardware topic

Hardware events are published under the _hw_ topic.

<table>
<tr>
<th>Event</th>
<th>Example response</th>
</tr>
<tr>
<td>Relay Switch</td>
<td>

```json
{
    "topic": "hw",
    "payload": {
        "type": "hw",
        "event": "relay",
        "event2": "state",
        "source": "power1",
        "active": false,
        "date": "2023-10-24T08:09:26.893Z"
    }
}
```

| Key      | Description          |
| -------- | -------------------- |
| `source` | `power1` \| `power2` |
| `active` | boolean              |

</td>
</tr>
<tr>
<td>Hardware button press</td>
<td>

```json
{
    "topic": "hw",
    "payload": {
        "type": "hw",
        "event": "button",
        "event2": "press",
        "source": "button2",
        "value": 1,
        "date": "2023-10-24T08:16:04.974Z"
    }
}
```

| Key      | Description                   |
| -------- | ----------------------------- |
| `source` | `button1` \| `button2`        |
| `value`  | number of presses, up to five |

Button events are only sent, if _Decouple buttons from relays_ is configured.

</td>
</tr>
</table>

## Sensor topic

When received from NSPanel, sensor data will be transformed and forwarded from the _controller_ node using the _sensor_ topic.

<table>
<tr>
<th>Event</th>
<th>Example response</th>
</tr>
<tr>
<td> <code>measurement</code></td>
<td>

```json
{
    "topic": "sensor",
    "payload": {
        "type": "sensor",
        "source": "temperature1",
        "event": "measurement",
        "temp": 17.8,
        "tempUnit": "C",
        "date": "2023-10-24T06:49:13.000Z"
    }
}
```

</td>
</tr>
</table>

## Event topic

<table>
<tr>
<th>Event</th>
<th>Example response</th>
</tr>
<tr>
<td>
 <code>startup</code> <br>(HMI display startup)</td>
<td>

```json
{
    "topic": "event",
    "payload": {
        "type": "event",
        "event": "startup",
        "source": "hmi",
        "hmiVersion": {
            "version": null,
            "internalVersion": "53",
            "model": "eu"
        },
        "date": "2023-10-24T08:24:38.693Z"
    }
}
```

| Key          | Description                                                                                                       |
| ------------ | ----------------------------------------------------------------------------------------------------------------- |
| `hmiVersion` | `version` = `null`<br> `internalVersion` = internal numeric version number<br> `model` = `us-p` \| `us-l` \| `eu` |

</td>
</tr>
<tr>
<td><code>buttonPress2</code><br>(screensaver)</td>
<td>

```json
{
    "topic": "event",
    "payload": {
        "type": "event",
        "event": "buttonPress2",
        "source": "screensaver",
        "event2": "bExit",
        "value": 1,
        "date": "2023-10-24T08:36:39.249Z"
    }
}
```

| Key     | Description       |
| ------- | ----------------- |
| `value` | number of presses |

</td>
</tr>

<tr>
<td><code>sleepReached</code><br>(pages)</td>
<td>

```json
{
    "topic": "event",
    "payload": {
        "type": "event",
        "event": "sleepReached",
        "source": "cardGrid",
        "date": "2023-10-24T08:38:06.693Z"
    }
}
```

| Key      | Description                            |
| -------- | -------------------------------------- |
| `source` | type of page where the timeout occured |

</td>
</tr>

</table>
