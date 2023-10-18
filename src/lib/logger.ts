import { IRedNode } from '@types'

const dateOptions: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }
const timeOptions: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: 'numeric', second: 'numeric' }

type LogFacility = 'error' | 'warn' | 'info' | 'debug' | 'trace'
type LogFunction = (message: string | undefined, node?: IRedNode<any>) => void
export interface ILogger {
    info: LogFunction
    warn: LogFunction
    error: LogFunction
    trace: LogFunction
    debug: LogFunction
}

const logMessage = (callback: Function, facility: LogFacility, prefix: string, node?: IRedNode<any>) => {
    return (message: string) => {
        const date = new Date()
        const timestamp =
            date.toLocaleDateString('en-GB', dateOptions) + ' ' + date.toLocaleTimeString('en-GB', timeOptions)
        const prefixStr = node !== undefined ? `${node.name}:${node.id}` : prefix

        if (prefixStr) {
            return callback(`${timestamp} - [${facility}] [${prefixStr}] ${message}`)
        } else {
            return callback(`${timestamp} - [${facility}] ${message}`)
        }
    }
}

export const Logger = (prefix: string): ILogger => {
    const logToConsole = (facility: LogFacility, message: string | undefined, node?: IRedNode<any>): void => {
        if (message == null) return

        var facilityCb: Function
        switch (facility) {
            case 'error':
                facilityCb = console.error
                break

            case 'warn':
                facilityCb = console.warn
                break

            case 'debug':
                facilityCb = console.debug
                break

            case 'trace':
                facilityCb = console.trace
                break

            default:
                facilityCb = console.log
                break
        }

        logMessage(facilityCb, facility, prefix, node)(message)
    }

    const logToNode = (facility: LogFacility, message: string | undefined, node?: IRedNode<any>): void => {
        if (message == null || node == null) return

        var nodeLogCb: Function
        switch (facility) {
            case 'error':
                nodeLogCb = node.error
                break

            case 'warn':
                nodeLogCb = node.warn
                break

            case 'debug':
                nodeLogCb = node.debug
                break

            case 'trace':
                nodeLogCb = node.trace
                break
            default:
                nodeLogCb = node.log
                break
        }

        nodeLogCb(message)
    }

    var logger: ILogger = {
        error: (message: string | undefined, node?: IRedNode<any>) => {
            logToNode('error', message)
            logToConsole('error', message, node)
        },
        warn: (message: string | undefined, node?: IRedNode<any>) => {
            logToNode('warn', message)
            logToConsole('warn', message, node)
        },
        info: (message: string | undefined, node?: IRedNode<any>) => logToConsole('info', message, node),
        trace: (message: string | undefined, node?: IRedNode<any>) => logToConsole('trace', message, node),
        debug: (message: string | undefined, node?: IRedNode<any>) => logToConsole('debug', message, node),
    }
    return logger
}
