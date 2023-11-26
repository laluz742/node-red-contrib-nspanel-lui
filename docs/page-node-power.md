# Power Page Node

General information on configuration and input messages can be found in the documentation on the [page nodes](./page-nodes.md).

## Configuration

## Input Messages

### Data Message

```json
{
    "topic": "data",
    "payload": [
        {
            "entityId": "string",
            "icon": "string",
            "iconColor": "string",
            "text": "string",
            "speed": "number"
        }
    ]
}
```

| Key         | Description                                                                                         |
| ----------- | --------------------------------------------------------------------------------------------------- |
| `entityId`  | id of the entity as configured in node settings                                                     |
| `icon`      | icon to display                                                                                     |
| `iconColor` | optional, the color to be used for the icon in hex rgb (`#rrggbb`) or integer format (`rgb(R,G,B)`) |
| `text`      | optional, label                                                                                     |
| `speed`     | optional, speed of the flow (value between `-120` and `120`)                                        |
