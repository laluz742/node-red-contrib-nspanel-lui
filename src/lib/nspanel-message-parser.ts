import { NSPanelMessageUtils } from './nspanel-message-utils'
import { EventArgs, StartupEventArgs, HardwareEventArgs, SensorEventArgs, LightEventArgs } from '../types'
import { NSPanelUtils } from './nspanel-utils'

export class NSPanelMessageParser {
    public static parse(payloadStr: string): EventArgs {
        var result: EventArgs = {
            topic: '',
            event: '',
            event2: '',
            source: '',
        }

        try {
            const temp = JSON.parse(payloadStr)

            if ('CustomRecv' in temp) {
                result = NSPanelMessageParser.parseCustomMessage(temp.CustomRecv.split(','))
            } else {
                result.data = temp
            }
        } catch (err: unknown) {
            result.data = payloadStr
        }

        return result
    }

    public static parseCustomMessage(parts: Array<string>): EventArgs {
        var result: EventArgs = {
            topic: 'event',
            event: '',
            event2: '',
            source: '',
        }

        switch (parts[0]) {
            case 'event':
                result = NSPanelMessageParser.parseEvent(parts)
                break
        }

        return result
    }

    public static parseSensorEvent(input: any): SensorEventArgs {
        let result: SensorEventArgs = null

        if (NSPanelMessageUtils.hasProperty(input, 'ANALOG')) {
            const analogSensorData = input['ANALOG']
            const temp = analogSensorData['Temperature1']
            const tempUnit = input['TempUnit']
            if (temp !== undefined) {
                result = {
                    topic: 'sensor',
                    source: 'temperature1',
                    event: 'measurement',
                    temp: Number(temp) ?? null,
                    tempUnit: tempUnit ?? null,
                }
                if (NSPanelMessageUtils.hasProperty(input, 'Time')) {
                    var date = NSPanelMessageUtils.toDate(input['Time'])
                    if (date !== null) {
                        result.date = date
                    }
                }
            }
        }

        return result
    }

    public static parseHardwareEvent(input: any): HardwareEventArgs[] {
        var result: HardwareEventArgs[] = []

        if (NSPanelMessageUtils.hasProperty(input, 'POWER1')) {
            var eventArgs: HardwareEventArgs = NSPanelMessageParser.convertToRelayEvent(input, 'POWER1')
            result.push(eventArgs)
        }
        if (NSPanelMessageUtils.hasProperty(input, 'POWER2')) {
            var eventArgs: HardwareEventArgs = NSPanelMessageParser.convertToRelayEvent(input, 'POWER2')
            result.push(eventArgs)
        }

        if (NSPanelMessageUtils.hasProperty(input, 'Button1')) {
            var eventArgs: HardwareEventArgs = NSPanelMessageParser.convertToButtonEvent(input, 'Button1')
            result.push(eventArgs)
        }
        if (NSPanelMessageUtils.hasProperty(input, 'Button2')) {
            var eventArgs: HardwareEventArgs = NSPanelMessageParser.convertToButtonEvent(input, 'Button2')
            result.push(eventArgs)
        }

        if (result.length == 0) {
            var eventArgs: HardwareEventArgs = {
                topic: 'hw',
                date: new Date(),
                event: '',
                source: '',
                data: input,
            }
            result.push(eventArgs)
        }

        return result
    }

    private static convertToRelayEvent(input: any, property: string): HardwareEventArgs {
        var eventArgs: HardwareEventArgs = {
            topic: 'hw',
            date: new Date(),
            event: 'relay',
            event2: 'state',
            source: property.toLowerCase(),
            active: input[property] == 'ON' ? true : false,
        }
        return eventArgs
    }

    private static convertToButtonEvent(input: any, property: string): HardwareEventArgs {
        var eventArgs: HardwareEventArgs = {
            topic: 'hw',
            date: new Date(),
            event: 'button',
            event2: 'press',
            source: property.toLowerCase(),
            value: NSPanelMessageParser.actionStringToNumber(input[property]['Action']),
        }
        return eventArgs
    }

    public static parseEvent(parts: Array<string>): EventArgs {
        var eventArgs: EventArgs = {
            topic: 'event',
            date: new Date(),
            event: parts[1],
            source: parts[2],
        }

        switch (parts[1]) {
            case 'startup':
                const startupEventArgs = eventArgs as StartupEventArgs
                startupEventArgs.source = 'hmi'
                startupEventArgs.hmiVersion = {
                    version: Number(parts[2]),
                    model: parts[3],
                }
                eventArgs = startupEventArgs
                break

            case 'sleepReached':
                break

            case 'buttonPress2':
                eventArgs.event2 = parts[3]
                // normalize eventArgs
                switch (parts[3]) {
                    case 'button':
                        eventArgs.source = parts[3]
                        eventArgs.event2 = parts[2]
                        eventArgs.entityId = parts[2]
                        break

                    case 'OnOff':
                        eventArgs.source = parts[2]
                        eventArgs.entityId = parts[2]
                        eventArgs.active = NSPanelMessageUtils.toBoolean(parts[4])
                        break

                    case 'number-set':
                        // "event,buttonPress2,fan.0,number-set,3"
                        eventArgs.entityId = parts[2]
                        eventArgs.source = parts[2]

                        const n = Number(parts[4])
                        if (isNaN(n)) {
                            eventArgs.data = parts[4]
                        } else {
                            eventArgs.value = n
                        }
                        break

                    case 'colorWheel':
                        const lightEventArgs = eventArgs as LightEventArgs
                        lightEventArgs.event2 = 'color'

                        const colorDataStr = parts[4]
                        const colorDataArr = NSPanelUtils.stringIsNullOrEmpty(colorDataStr)
                            ? []
                            : colorDataStr.split('|')
                        if (colorDataArr.length == 3) {
                            const colorData = colorDataArr.map((v) => Number(v))
                            const colorTuple = NSPanelUtils.hmiPosToColor(colorData[0], colorData[1])
                            lightEventArgs.rgb = colorTuple[0]
                            lightEventArgs.hsv = colorTuple[1]
                        }

                        eventArgs = lightEventArgs
                        break

                    case 'positionSlider':
                        eventArgs.event2 = 'position'
                        break

                    case 'tiltSlider':
                        eventArgs.event2 = 'tilt'
                        break

                    default:
                        break
                }

                if (parts.length == 5) {
                    const n = Number(parts[4])

                    if (isNaN(n)) {
                        eventArgs.data = parts[4]
                    } else {
                        eventArgs.value = n
                    }
                }
                break

            case 'pageOpenDetail':
                eventArgs.entityId = parts[3]
                break

            default:
                eventArgs.data = {
                    raw: parts.slice(2),
                }
        }

        console.log('parseEvent', eventArgs)
        return eventArgs
    }

    public static actionStringToNumber(actionString: string): number | undefined {
        var result: number | undefined = undefined
        switch (actionString.toLowerCase()) {
            case 'single':
                result = 1
                break
            case 'double':
                result = 2
                break
            case 'triple':
                result = 3
                break
            case 'quad':
                result = 4
                break
            case 'penta':
                result = 5
                break
        }

        return result
    }
}
