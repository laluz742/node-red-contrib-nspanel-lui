import { IDisposable } from './base'
import { OnEventCallback, OnSensorDataCallback } from './pages'

export type OnMqttConnectCallback = () => void
export type OnMqttCloseCallback = (error?: Error) => void
export type OnMqttErrorCallback = (error: Error) => void

export interface IPanelMqttHandler extends IDisposable {
    sendCommandToPanel(cmd: string, data: string): void
    sendToPanel(data: string[] | string): void

    on(event: 'mqtt:connect', listener: OnMqttConnectCallback): void
    on(event: 'mqtt:reconnect', listener: OnMqttConnectCallback): void
    on(event: 'mqtt:close', listener: OnMqttCloseCallback): void
    on(event: 'mqtt:error', listener: OnMqttErrorCallback): void
    on(event: 'event', listener: OnEventCallback): void
    on(event: 'msg', listener: OnEventCallback): void
    on(event: 'sensor', listener: OnSensorDataCallback): void
}
