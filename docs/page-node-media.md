# Media Page Node

Visualization of a control panel for media playback.

## Configuration

For information on general node configuration, please see section [Configuration](./page-nodes.md#configuration) for page nodes.

## Input Messages

General information on input messages can be found in the documentation on the [page nodes](./page-nodes.md).

### Media Data Message

```json
{
    "topic": "media",
    "payload": {
        "title": "string",
        "titleColor": "string",
        "artist": "string",
        "artistColor": "string",
        "volume": "number",
        "iconPlayPause": "string"
    }
}
```

| Key | Description |
| --- | --- |
| `title` | optional, the text to show |
| `titleColor` | optional, the color to be used for the title, hex rgb (`#rrggbb`) or integer format (`rgb(R,G,B)`) |
| `artist` | optional, the artist text to be shown |
| `artistColor` | optional, the color to be used for the artist, hex rgb (`#rrggbb`) or integer format (`rgb(R,G,B)`) |
| `volume` | optional, number between `0` and `100` for volume level |
| `iconPlayPause` | optional, the icon to use for play/pause button |
