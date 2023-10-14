import { HMIVersion, IDisposable } from '.'

export interface IPanelUpdater extends IDisposable {
    setTasmotaVersion(tasmotaVersion: string): void
    setBerryDriverVersion(version: string): void
    setHmiVersion(hmiVersion: HMIVersion): void

    checkForUpdates(): void
}
