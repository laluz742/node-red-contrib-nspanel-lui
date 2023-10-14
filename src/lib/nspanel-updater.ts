import * as nEvents from 'events'
//import axios from 'axios'

// @ts-ignore 6133
import { Logger } from './logger'
import { HMIVersion, IPanelMqttHandler, IPanelUpdater } from '../types'
import { STR_CMD_BERRYDRIVER_VERSION, STR_CMD_TASMOTA_STATUS } from './nspanel-constants'

//const log = Logger('NSPanelUpdater')
type IPanelUpdateData = {
    tasmotaVersion: string | null
    berryDriverVersion: string | null
    hmiVersion: HMIVersion
}

export class NSPanelUpdater extends nEvents.EventEmitter implements IPanelUpdater {
    private _mqttHandler: IPanelMqttHandler | null = null
    private updateInProgress: boolean = false
    private updateData: IPanelUpdateData = {
        tasmotaVersion: null,
        berryDriverVersion: null,
        hmiVersion: null,
    }

    constructor(mqttHandler: IPanelMqttHandler) {
        super()
        this._mqttHandler = mqttHandler
    }

    public checkForUpdates(): void {
        console.log('updateData', this.updateData)
        this.requestTasmotaVersionFromPanel()
        this.requestBerryDriverVersionFromPanel()
    }

    private requestTasmotaVersionFromPanel(): void {
        const data = { payload: '2' }
        this._mqttHandler?.sendCommandToPanel(STR_CMD_TASMOTA_STATUS, data)
    }

    public setTasmotaVersion(tasmotaVersion: string): void {
        if (tasmotaVersion == null) return

        const tV =
            tasmotaVersion.indexOf('(') > 0 ? tasmotaVersion.substring(0, tasmotaVersion.indexOf('(')) : tasmotaVersion
        this.updateData.tasmotaVersion = tV
    }

    private requestBerryDriverVersionFromPanel(): void {
        const data = { payload: 'x' }
        this._mqttHandler?.sendCommandToPanel(STR_CMD_BERRYDRIVER_VERSION, data)
    }

    public setBerryDriverVersion(version: string): void {
        if (version != null) this.updateData.berryDriverVersion = version
    }

    public setHmiVersion(hmiVersion: HMIVersion): void {
        this.updateData.hmiVersion = hmiVersion
    }

    public dispose(): void {}
}
