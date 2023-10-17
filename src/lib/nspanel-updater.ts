import * as nEvents from 'events'
import axios, { AxiosRequestConfig } from 'axios'

// @ts-ignore 6133
import { Logger } from './logger'
import { HMIVersion, IPanelController, IPanelMqttHandler, IPanelUpdater, VersionData } from '../types'
import {
    STR_BERRYDRIVER_CMD_FLASHNEXTION,
    STR_BERRYDRIVER_CMD_UPDATE,
    STR_BERRYDRIVER_CMD_GETVERSION,
    STR_LUI_CMD_ACTIVATE_STARTUP_PAGE,
    STR_TASMOTA_CMD_OTAURL,
    STR_TASMOTA_CMD_STATUS,
    STR_TASMOTA_CMD_UPGRADE,
    STR_HTTP_USER_AGENT_VALUE,
} from './nspanel-constants'

type PanelVersionData = {
    tasmota: VersionData | null
    berryDriver: VersionData | null
    hmi: HMIVersion | null
}

enum VersionAcquisitionStatus {
    None = 0,
    TasmotaVersionCurrent = 1,
    TasmotaVersionLatest = 2,
    BerryDriverVersionCurrent = 4,
    BerryDriverVersionLatest = 8,
    HmiVersionCurrent = 16,
    HmiVersionLatest = 32,
    AllAcquired = ~(~0 << 6),
}

type PanelUpdateData = {
    versions: {
        current: PanelVersionData
        latest: PanelVersionData
    }
    versionAcquisitionStatus: VersionAcquisitionStatus
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
        STR_HTTP_USER_AGENT: STR_HTTP_USER_AGENT_VALUE,
    },
}

const BERRY_DRIVER_REGEX = /version_of_this_script\s*=\s*(?<version>\d+)/
const NLUI_HMI_VERSION_REGEX =
    /desired_display_firmware_version\s*=\s*(?<internalVersion>\d+)\s*version\s*=\s*['"]v(?<version>.*)['"]/

const log = Logger('NSPanelUpdater')

export class NSPanelUpdater extends nEvents.EventEmitter implements IPanelUpdater {
    private _panelController: IPanelController
    private _mqttHandler: IPanelMqttHandler | null = null

    private _updateInProgress: boolean = false

    private _updateData: PanelUpdateData = {
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
        versionAcquisitionStatus: VersionAcquisitionStatus.None,
    }

    constructor(panelController: IPanelController, mqttHandler: IPanelMqttHandler) {
        super()
        this._mqttHandler = mqttHandler
        this._panelController = panelController
    }

    public checkForUpdates(): void {
        // TODO: promisify the wait for version data
        this._acquireVersions()
            .then(() => {
                // TODO: initiate update process or show notification
            })
            .catch((versionAcquisitionStatus) => {
                log.error('Could not acquire version data ' + versionAcquisitionStatus)
            })
    }

    private _updateHmi(): void {
        // TODO: build URL
        log.info('Initiating flashing of the NSPanel HMI firmware')
        const hmiFirmwareUrl = 'http://nspanel.pky.eu/lui-release.tft'

        this._updateInProgress = true
        this._mqttHandler?.sendCommandToPanel(STR_BERRYDRIVER_CMD_FLASHNEXTION, { payload: hmiFirmwareUrl })
        /*
UNCATCHED onEvent default {"type":"hw","date":"2023-10-16T15:07:27.313Z","event":"","source":"","data":{"FlashNextion":"Done"}}
UNCATCHED msg {"type":"","event":"","event2":"","source":"","data":{"Flashing":{"complete":0,"time_elapsed":0}}}
        */
    }

    private _updateBerryDriver(): void {
        log.info('Updateing NSPanel BerryDriver ')
        const berryDriverUrl = 'https://raw.githubusercontent.com/joBr99/nspanel-lovelace-ui/main/tasmota/autoexec.be'

        const updCmd = `Backlog UpdateDriverVersion ${berryDriverUrl}; Restart 1`
        this._mqttHandler?.sendCommandToPanel(STR_BERRYDRIVER_CMD_UPDATE, { payload: updCmd })

        /*
UNCATCHED onEvent default {"type":"hw","date":"2023-10-16T15:11:29.360Z","event":"","source":"","data":{"UpdateDriverVersion":"Done"}}
UNCATCHED onEvent default {"type":"hw","date":"2023-10-16T15:11:30.637Z","event":"","source":"","data":{"Restart":"Restarting"}}        
        */
    }

    private _updateTasmotaFirmware() {
        /*
onEvent default {"type":"hw","date":"2023-10-16T15:15:05.211Z","event":"","source":"","data":{"Upgrade":"Version 13.1.0 from http://ota.tasmota.com/tasmota32/release/tasmota32-nspanel.bin"}}        
        */
        const otaUrl = 'http://ota.tasmota.com/tasmota32/release/tasmota32-nspanel.bin' // FIXME

        this._mqttHandler?.sendCommandToPanel(STR_TASMOTA_CMD_OTAURL, { payload: otaUrl })
        // TODO: sleep
        this._mqttHandler?.sendCommandToPanel(STR_TASMOTA_CMD_UPGRADE, { payload: '1' })
    }

    private _acquireVersions(): Promise<VersionAcquisitionStatus> {
        this._updateData.versionAcquisitionStatus = VersionAcquisitionStatus.None

        this.getCurrentTasmotaVersion()
        this.getCurrentBerryDriverVersion()
        this.getCurrentHmiVersion()
        this.getLatestVersion()
        var i = 10

        var self = this
        return new Promise((resolve, reject) => {
            ;(function waitForDataAcquisition() {
                if (
                    (self._updateData.versionAcquisitionStatus & VersionAcquisitionStatus.AllAcquired) ===
                    VersionAcquisitionStatus.AllAcquired
                )
                    return resolve(self._updateData.versionAcquisitionStatus)

                setTimeout(waitForDataAcquisition, 1000)

                if (--i == 0) reject(self._updateData.versionAcquisitionStatus)
            })()
        })
    }

    public setTasmotaVersion(tasmotaVersion: string): void {
        if (tasmotaVersion != null) {
            const tV =
                tasmotaVersion.indexOf('(') > 0
                    ? tasmotaVersion.substring(0, tasmotaVersion.indexOf('('))
                    : tasmotaVersion
            this._updateData.versions.current.tasmota = { version: tV }
            this._updateData.versionAcquisitionStatus |= VersionAcquisitionStatus.TasmotaVersionCurrent
        }
    }

    public setBerryDriverVersion(version: string): void {
        if (version != null) {
            this._updateData.versions.current.berryDriver = { version: version }
            this._updateData.versionAcquisitionStatus |= VersionAcquisitionStatus.BerryDriverVersionCurrent
        }
    }

    public setHmiVersion(hmiVersion: HMIVersion): void {
        this._updateData.versions.current.hmi = hmiVersion
        this._updateData.versionAcquisitionStatus |= VersionAcquisitionStatus.HmiVersionCurrent
    }

    // #region version information retrieval
    private getCurrentHmiVersion(): void {
        const data = { payload: STR_LUI_CMD_ACTIVATE_STARTUP_PAGE }
        this._mqttHandler?.sendToPanel(data)
    }

    private getCurrentBerryDriverVersion(): void {
        const data = { payload: 'x' }
        this._mqttHandler?.sendCommandToPanel(STR_BERRYDRIVER_CMD_GETVERSION, data)
    }

    private getCurrentTasmotaVersion(): void {
        const data = { payload: '2' }
        this._mqttHandler?.sendCommandToPanel(STR_TASMOTA_CMD_STATUS, data)
    }

    private getLatestVersion(): void {
        axios.get<githubApiReleaseSchema>(URL_TASMOTA_RELEASES_LATEST_META, axiosRequestOptions).then((response) => {
            const { data } = response
            if (data?.tag_name != null) {
                const tasmotaVersionLatest = String.prototype.substring.call(data.tag_name, 1)
                this._updateData.versions.latest.tasmota = tasmotaVersionLatest
                this._updateData.versionAcquisitionStatus |= VersionAcquisitionStatus.TasmotaVersionLatest
                // TODO: pick right asset
            }
        })

        axios.get<string>(URL_BERRYDRIVER_LATEST, axiosRequestOptions).then((response) => {
            if (response?.data != null) {
                const match = response.data.match(BERRY_DRIVER_REGEX)

                if (match?.groups != null && match.groups['version'] != null) {
                    this._updateData.versions.latest.berryDriver = { version: match.groups['version'] }
                    this._updateData.versionAcquisitionStatus |= VersionAcquisitionStatus.BerryDriverVersionLatest
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
                    this._updateData.versions.latest.hmi = {
                        internalVersion: match.groups['internalVersion'],
                        version: match.groups['version'],
                    }
                    this._updateData.versionAcquisitionStatus |= VersionAcquisitionStatus.HmiVersionLatest
                }
            }
        })
    }
    // #endregion version information retrieval

    public dispose(): void {}
}
