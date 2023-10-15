import * as nEvents from 'events'
import axios, { AxiosRequestConfig } from 'axios'

// @ts-ignore 6133
import { Logger } from './logger'
import { HMIVersion, IPanelMqttHandler, IPanelUpdater, VersionData } from '../types'
import {
    STR_CMD_BERRYDRIVER_VERSION,
    STR_CMD_LUI_ACTIVATE_STARTUP_PAGE,
    STR_CMD_TASMOTA_STATUS,
} from './nspanel-constants'

//const log = Logger('NSPanelUpdater')
type PanelVersionData = {
    tasmota: VersionData | null
    berryDriver: VersionData | null
    hmi: HMIVersion | null
}

type AcquisitionStatusFlag = {
    fromPanel: boolean
    fromSource: boolean
}

type PanelUpdateData = {
    versions: {
        current: PanelVersionData
        latest: PanelVersionData
    }
    flags: {
        tasmotaVersionAcquired: AcquisitionStatusFlag
        berryDriverVersionAcquired: AcquisitionStatusFlag
        hmiVersionAcquired: AcquisitionStatusFlag
    }
}

type githubApiReleaseAssetsSchema = {
    name: string
    url: string
    browser_download_url: string
}

type githubApiReleaseSchema = {
    name: string
    tag_name: string
    published_at: Date
    assets: githubApiReleaseAssetsSchema[]
}

const URL_TASMOTA_RELEASES_LATEST_META = 'https://api.github.com/repositories/80286288/releases/latest'
const URL_BERRYDRIVER_LATEST = 'https://raw.githubusercontent.com/joBr99/nspanel-lovelace-ui/main/tasmota/autoexec.be'
//const URL_NLUI_RELEASES_LATEST_META = 'https://api.github.com/repos/joBr99/nspanel-lovelace-ui/releases/latest'
const URL_NLUI_LATEST =
    'https://raw.githubusercontent.com/joBr99/nspanel-lovelace-ui/main/apps/nspanel-lovelace-ui/nspanel-lovelace-ui.py'

const axiosRequestOptions: AxiosRequestConfig = {
    headers: {
        'User-Agent': 'node-red-contrib-nspanel-lui',
    },
}

const BERRY_DRIVER_REGEX = /version_of_this_script\s*=\s*(?<version>\d+)/
const NLUI_HMI_VERSION_REGEX =
    /desired_display_firmware_version\s*=\s*(?<internalVersion>\d+)\s*version\s*=\s*['"]v(?<version>.*)['"]/

const log = Logger('NSPanelUpdater')

export class NSPanelUpdater extends nEvents.EventEmitter implements IPanelUpdater {
    private _mqttHandler: IPanelMqttHandler | null = null

    private updateData: PanelUpdateData = {
        versions: {
            current: {
                tasmota: null,
                berryDriver: null,
                hmi: null,
            },
            latest: {
                tasmota: null,
                berryDriver: null,
                hmi: null,
            },
        },
        flags: {
            tasmotaVersionAcquired: {
                fromPanel: false,
                fromSource: false,
            },
            berryDriverVersionAcquired: {
                fromPanel: false,
                fromSource: false,
            },
            hmiVersionAcquired: {
                fromPanel: false,
                fromSource: false,
            },
        },
    }

    constructor(mqttHandler: IPanelMqttHandler) {
        super()
        this._mqttHandler = mqttHandler
    }

    public checkForUpdates(): void {
        // TODO: promisify the wait for version data
        this.acquireVersions()
            .then(() => {
                // TODO: initiate update process or show notification
            })
            .catch(() => {
                log.error('Could not acquire version data')
            })
    }

    private acquireVersions(): Promise<boolean> {
        this.clearUpdateStatusFlags()

        this.requestTasmotaVersionFromPanel()
        this.requestBerryDriverVersionFromPanel()
        this.requestHmiVersionFromPanel()
        this.getLatestVersionsFromOnline()
        var i = 5

        var self = this
        return new Promise((resolve, reject) => {
            ;(function waitForDataAcquisition() {
                if (
                    self.updateData.flags.tasmotaVersionAcquired.fromPanel === true &&
                    self.updateData.flags.tasmotaVersionAcquired.fromSource === true &&
                    self.updateData.flags.berryDriverVersionAcquired.fromSource === true &&
                    self.updateData.flags.berryDriverVersionAcquired.fromSource === true &&
                    self.updateData.flags.hmiVersionAcquired.fromSource === true &&
                    self.updateData.flags.hmiVersionAcquired.fromSource === true
                )
                    return resolve(true)

                setTimeout(waitForDataAcquisition, 1000)

                if (--i == 0) reject(false)
            })()
        })
    }

    private requestTasmotaVersionFromPanel(): void {
        const data = { payload: '2' }
        this._mqttHandler?.sendCommandToPanel(STR_CMD_TASMOTA_STATUS, data)
    }

    public setTasmotaVersion(tasmotaVersion: string): void {
        if (tasmotaVersion != null) {
            const tV =
                tasmotaVersion.indexOf('(') > 0
                    ? tasmotaVersion.substring(0, tasmotaVersion.indexOf('('))
                    : tasmotaVersion
            this.updateData.versions.current.tasmota = { version: tV }
            this.updateData.flags.tasmotaVersionAcquired.fromPanel = true
        }
    }

    private requestBerryDriverVersionFromPanel(): void {
        const data = { payload: 'x' }
        this._mqttHandler?.sendCommandToPanel(STR_CMD_BERRYDRIVER_VERSION, data)
    }

    public setBerryDriverVersion(version: string): void {
        if (version != null) {
            this.updateData.versions.current.berryDriver = { version: version }
            this.updateData.flags.berryDriverVersionAcquired.fromPanel = true
        }
    }

    private requestHmiVersionFromPanel(): void {
        const data = { payload: STR_CMD_LUI_ACTIVATE_STARTUP_PAGE }
        this._mqttHandler?.sendToPanel(data)
    }

    public setHmiVersion(hmiVersion: HMIVersion): void {
        this.updateData.versions.current.hmi = hmiVersion
        this.updateData.flags.hmiVersionAcquired.fromPanel = true
    }

    private getLatestVersionsFromOnline(): void {
        axios.get<githubApiReleaseSchema>(URL_TASMOTA_RELEASES_LATEST_META, axiosRequestOptions).then((response) => {
            const { data } = response
            if (data?.tag_name != null) {
                const tasmotaVersionLatest = String.prototype.substring.call(data.tag_name, 1)
                this.updateData.versions.latest.tasmota = tasmotaVersionLatest
                this.updateData.flags.tasmotaVersionAcquired.fromSource = true
                // TODO: pick right asset
            }
        })

        axios.get<string>(URL_BERRYDRIVER_LATEST, axiosRequestOptions).then((response) => {
            if (response?.data != null) {
                const match = response.data.match(BERRY_DRIVER_REGEX)

                if (match?.groups != null && match.groups['version'] != null) {
                    this.updateData.versions.latest.berryDriver = { version: match.groups['version'] }
                    this.updateData.flags.berryDriverVersionAcquired.fromSource = true
                }
            }
        })

        /* TODOGithub data needed?
        axios.get<githubApiReleaseSchema>(URL_NLUI_RELEASES_LATEST_META, axiosRequestOptions).then((response) => {
            const { data } = response
            if (data?.tag_name != null) {
                const hmiVersionLatest = String.prototype.substring.call(data.tag_name, 1)
                this.updateData.latest.hmi = { version: hmiVersionLatest }
                // TODO: pick right asset
            }
        })*/

        axios.get<string>(URL_NLUI_LATEST, axiosRequestOptions).then((response) => {
            if (response?.data != null) {
                const match = response.data.match(NLUI_HMI_VERSION_REGEX)

                if (match?.groups != null && match.groups['version'] != null && match.groups['internalVersion']) {
                    this.updateData.versions.latest.hmi = {
                        internalVersion: match.groups['internalVersion'],
                        version: match.groups['version'],
                    }
                    this.updateData.flags.hmiVersionAcquired.fromSource = true
                }
            }
        })
    }

    private clearUpdateStatusFlags(): void {
        this.updateData.flags = {
            tasmotaVersionAcquired: {
                fromPanel: false,
                fromSource: false,
            },
            berryDriverVersionAcquired: {
                fromPanel: false,
                fromSource: false,
            },
            hmiVersionAcquired: {
                fromPanel: false,
                fromSource: false,
            },
        }
    }

    public dispose(): void {}
}
