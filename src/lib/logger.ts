import { IRedNode } from '../types'

const dateOptions: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }
const timeOptions: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: 'numeric', second: 'numeric' }

type LogFunction = (message: string, node?: IRedNode<any>) => void
export interface ILogger {
    info: LogFunction
    warn: LogFunction
    error: LogFunction
}

const logMessage = (callback: Function, facility: string, prefix: string, node?: IRedNode<any>) => {
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
    const logError: LogFunction = (message: string, node?: IRedNode<any>) => {
        node?.error(message)

        logMessage(console.error, 'error', prefix, node)(message)
    }

    const logWarn: LogFunction = (message: string, node?: IRedNode<any>) => {
        node?.warn(message)

        logMessage(console.warn, 'warn', prefix, node)(message)
    }

    const logInfo: LogFunction = (message: string, node?: IRedNode<any>) => {
        logMessage(console.log, 'info', prefix, node)(message)
    }

    var logger: ILogger = {
        info: logInfo,
        warn: logWarn,
        error: logError,
    }
    return logger
}
