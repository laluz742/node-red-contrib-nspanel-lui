import * as nEvents from 'events'

import { Logger } from './logger'
import { HMIVersion, IPanelUpdater } from '../types'

const log = Logger('NSPanelUpdater')

export class NSPanelUpdater extends nEvents.EventEmitter implements IPanelUpdater {
    private updateInProgress: boolean = false

    private hmiVersion: HMIVersion = null

    constructor() {
        super()
    }

    setHmiVersion(hmiVersion: HMIVersion): void {
        this.hmiVersion = hmiVersion
    }

    dispose(): void {}
}
