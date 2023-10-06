import { HMIVersion, IDisposable } from '.'

export interface IPanelUpdater extends IDisposable {
    setHmiVersion(hmiVersion: HMIVersion): void
}
