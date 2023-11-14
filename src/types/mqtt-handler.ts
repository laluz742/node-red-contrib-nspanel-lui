import { IDisposable } from './base'
import { HMICommand, TasmotaCommand } from './commands'
import { OnEventCallback, OnSensorDataCallback } from './pages'

export type OnMqttConnectCallback = () => void
export type OnMqttCloseCallback = (error?: Error) => void
export type OnMqttErrorCallback = (error: Error) => void

export interface IPanelMqttHandler extends IDisposable {
    sendCommandToPanel(cmd: TasmotaCommand): void
    sendToPanel(data: HMICommand[] | HMICommand): void

    on(event: 'mqtt:connect', listener: OnMqttConnectCallback): void
    on(event: 'mqtt:reconnect', listener: OnMqttConnectCallback): void
    on(event: 'mqtt:close', listener: OnMqttCloseCallback): void
    on(event: 'mqtt:error', listener: OnMqttErrorCallback): void
    on(event: 'event', listener: OnEventCallback): void
    on(event: 'msg', listener: OnEventCallback): void
    on(event: 'sensor', listener: OnSensorDataCallback): void
}
