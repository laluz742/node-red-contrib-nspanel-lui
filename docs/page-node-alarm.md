# Alarm Page Node

General information on configuration and input messages can be found in the documentation on the [page nodes](./page-nodes.md).

## Configuration

## Input Messages

### Data Message

```json
{
    "topic": "data",
    "payload": {
        "statusIcon": "string",
        "statusIconColor": "string",
        "statusIconFlashing": "boolean",
        "numPadDisabled": "boolean"
    }
}
```

| Key | Description |
| --- | --- |
| `statusIcon` | optional, icon to show |
| `statusIconColor` | optional, the color to be used for the icon, hex rgb (`#rrggbb`) or integer format (`rgb(R,G,B)`) |
| `statusIconFlashing` | `true` for flashing status icon, otherwise `false` |
| `numPadDisabled` | `true` to hide num-pad, otherwise `false` |
