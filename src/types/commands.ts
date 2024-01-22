import { CommandData } from './messages'

export type TasmotaCommand = {
    cmd: string
    data: string
}

export type HMICommandParameters = (string | number) | (string | number)[]
export type HMICommand = {
    cmd: string
    params: HMICommandParameters
}

export interface IPanelCommandHandler {
    executeCommand(commands: CommandData | CommandData[])
    sendHMICommand(cmds: HMICommand | HMICommand[] | null)
    sendTasmotaCommand(cmd: TasmotaCommand)

    sendTimeoutToPanel(timeout?: number)
    sendTimeToPanel(timeString: string)
    sendDateToPanel(dateString: string)

    sendBuzzerCommand(count: number, beepDuration?: number, silenceDuration?: number, tune?: number)
}
