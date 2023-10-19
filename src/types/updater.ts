import { IDisposable } from './base'
import { HMIVersion } from './events'

export interface IPanelUpdater extends IDisposable {
    setTasmotaVersion(tasmotaVersion: string): void
    setBerryDriverVersion(version: string): void
    setHmiVersion(hmiVersion: HMIVersion): void

    checkForUpdates(): void
}

export type IPanelUpdaterOptions = {
    autoUpdate: boolean
}
