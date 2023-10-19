import { IDisposable } from './base'
import { HMIVersion, FirmwareEventArgs } from './events'

export interface IPanelUpdater extends IDisposable {
    setHmiVersion(hmiVersion: HMIVersion): void

    checkForUpdates(): void

    onFirmwareEvent(fwEvent: FirmwareEventArgs): void
    onUpdateNotificationResult(notifyId: string, action: string): void
}

export type IPanelUpdaterOptions = {
    autoUpdate: boolean
}
