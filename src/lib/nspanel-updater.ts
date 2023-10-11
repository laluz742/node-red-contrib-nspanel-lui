import * as nEvents from 'events'

// @ts-ignore 6133
import { Logger } from './logger'
import { HMIVersion, IPanelUpdater } from '../types'

//const log = Logger('NSPanelUpdater')

export class NSPanelUpdater extends nEvents.EventEmitter implements IPanelUpdater {
    // @ts-ignore 6133
    private updateInProgress: boolean = false

    // @ts-ignore 6133
    private hmiVersion: HMIVersion = null

    constructor() {
        super()
    }

    setHmiVersion(hmiVersion: HMIVersion): void {
        this.hmiVersion = hmiVersion
    }

    dispose(): void {}
}
