# Chart Page Node

General information on configuration and input messages can be found in the documentation on the [page nodes](./page-nodes.md).

## Configuration

## Input Messages

### Data Message

Example data message:

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
