import { IPanelMqttHandler } from '../types/mqtt-handler'
import {
    BuzzerCommandParams,
    CommandData,
    HMICommand,
    IPanelCommandHandler,
    SwitchCommandParams,
    TasmotaCommand,
} from '../types/types'
import * as NSPanelConstants from './nspanel-constants'

export type IPanelCommandHandlerOptions = {
    defaultTimeout: number
}

export class NSPanelCommandHandler implements IPanelCommandHandler {
    _panelMqttHandler: IPanelMqttHandler
    _options: IPanelCommandHandlerOptions

    constructor(mqttHandler: IPanelMqttHandler, options: IPanelCommandHandlerOptions) {
        this._panelMqttHandler = mqttHandler
        this._options = options
    }

    public executeCommand(commands: CommandData | CommandData[]) {
        const cmds: CommandData[] = Array.isArray(commands) ? commands : [commands]

        cmds.forEach((cmdData) => {
            switch (cmdData.cmd) {
                case 'switch': {
                    const switchParams = cmdData.params as SwitchCommandParams
                    const switchRelayCmd: string = NSPanelConstants.STR_TASMOTA_CMD_RELAY + (switchParams.id + 1)
                    this.sendTasmotaCommand({
                        cmd: switchRelayCmd,
                        data: switchParams.active?.toString() ?? '',
                    })

                    break
                }

                case 'toggle': {
                    const toggleParams = cmdData.params as SwitchCommandParams
                    const toggleRelayCmd: string = NSPanelConstants.STR_TASMOTA_CMD_RELAY + (toggleParams.id + 1)
                    this.sendTasmotaCommand({
                        cmd: toggleRelayCmd,
                        data: NSPanelConstants.STR_TASMOTA_PARAM_RELAY_TOGGLE,
                    })
                    break
                }

                case 'beep': {
                    const params = cmdData.params as BuzzerCommandParams
                    this.sendBuzzerCommand(params.count, params.beepDuration, params.silenceDuration, params.tune)
                    break
                }
            }
        })
    }

    public sendHMICommand(cmds: HMICommand | HMICommand[] | null) {
        if (cmds == null || this._panelMqttHandler === null) return

        this._panelMqttHandler?.sendToPanel(cmds)
    }

    public sendTasmotaCommand(cmd: TasmotaCommand) {
        this._panelMqttHandler?.sendCommandToPanel(cmd)
    }

    public sendTimeoutToPanel(timeout: number) {
        const tempTimeout = timeout != null && !Number.isNaN(timeout) ? timeout : this._options.defaultTimeout

        const hmiCmd: HMICommand = {
            cmd: NSPanelConstants.STR_LUI_CMD_TIMEOUT,
            params: tempTimeout,
        }
        this.sendHMICommand(hmiCmd)
    }

    public sendTimeToPanel(timeString: string) {
        const hmiCmd: HMICommand = {
            cmd: NSPanelConstants.STR_LUI_CMD_TIME,
            params: timeString,
        }
        this.sendHMICommand(hmiCmd)
    }

    public sendDateToPanel(dateStr: string) {
        const hmiCmd: HMICommand = {
            cmd: NSPanelConstants.STR_LUI_CMD_DATE,
            params: dateStr,
        }
        this.sendHMICommand(hmiCmd)
    }

    public sendBuzzerCommand(count: number, beepDuration?: number, silenceDuration?: number, tune?: number) {
        const params = [count]
        if (beepDuration != null) params.push(beepDuration)
        if (silenceDuration != null) params.push(silenceDuration)
        if (tune != null) params.push(tune)

        this.sendTasmotaCommand({
            cmd: NSPanelConstants.STR_TASMOTA_CMD_BUZZER,
            data: params.join(','),
        })
    }
}
