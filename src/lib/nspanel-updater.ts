// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import * as nEvents from 'events'
import axios, { AxiosRequestConfig } from 'axios'
import * as semver from 'semver'

import { Logger } from './logger'
import {
    HMIVersion,
    IPanelController,
    IPanelMqttHandler,
    IPanelUpdater,
    IPanelUpdaterOptions,
    NotifyData,
    VersionData,
    NodeRedI18nResolver,
} from '../types/types'

import {
    STR_BERRYDRIVER_CMD_FLASHNEXTION,
    STR_BERRYDRIVER_CMD_UPDATE,
    STR_BERRYDRIVER_CMD_GETVERSION,
    STR_LUI_CMD_ACTIVATE_STARTUP_PAGE,
    STR_TASMOTA_CMD_OTAURL,
    STR_TASMOTA_CMD_STATUS,
    STR_TASMOTA_CMD_UPGRADE,
    STR_HTTP_USER_AGENT_VALUE,
    STR_LUI_LINEBREAK,
    STR_LUI_COLOR_GREEN,
    STR_LUI_COLOR_RED,
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

    TasmotaUpdateAvailable = 64,
    BerryDriverUpdateAvailable = 128,
    HmiUpdateAvailable = 256,
}

type PanelUpdateData = {
    versions: {
        current: PanelVersionData
        latest: PanelVersionData
    }
    versionAcquisitionStatus: VersionAcquisitionStatus
}

type GithubApiReleaseAssetsSchema = {
    name: string
    url: string
    browser_download_url: string
}

type GithubApiReleaseSchema = {
    name: string
    tag_name: string
    published_at: Date
    assets: GithubApiReleaseAssetsSchema[]
}

const URL_TASMOTA_RELEASES_LATEST_META = 'https://api.github.com/repositories/80286288/releases/latest'
const URL_BERRYDRIVER_LATEST = 'https://raw.githubusercontent.com/joBr99/nspanel-lovelace-ui/main/tasmota/autoexec.be'
// const URL_NLUI_RELEASES_LATEST_META = 'https://api.github.com/repos/joBr99/nspanel-lovelace-ui/releases/latest'
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

    private _i18n: NodeRedI18nResolver = null

    private _options: IPanelUpdaterOptions = null

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

    constructor(
        panelController: IPanelController,
        mqttHandler: IPanelMqttHandler,
        i18n: NodeRedI18nResolver,
        options: IPanelUpdaterOptions
    ) {
        super()
        this._mqttHandler = mqttHandler
        this._panelController = panelController
        this._i18n = i18n
        this._options = options
    }

    public checkForUpdates(): void {
        // TODO: promisify the wait for version data
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const self = this
        this._acquireVersions()
            .then(() => {
                if (self._options.autoUpdate === false) {
                    // TODO: save state when multiple updates available
                    let notifyTextMain: string
                    let currentVersion: string
                    let latestVersion: string

                    if (
                        (self._updateData.versionAcquisitionStatus &
                            VersionAcquisitionStatus.TasmotaUpdateAvailable) ===
                        VersionAcquisitionStatus.TasmotaUpdateAvailable
                    ) {
                        notifyTextMain = self._i18n('nspanel-controller.panel.newFirmwareTasmotaTextMain')
                        currentVersion = self._updateData.versions.current.tasmota.version
                        latestVersion = self._updateData.versions.latest.tasmota.version

                        self.showUpdateNotification('Tasmota', notifyTextMain, currentVersion, latestVersion)
                    }

                    if (
                        (self._updateData.versionAcquisitionStatus &
                            VersionAcquisitionStatus.BerryDriverUpdateAvailable) ===
                        VersionAcquisitionStatus.BerryDriverUpdateAvailable
                    ) {
                        notifyTextMain = self._i18n('nspanel-controller.panel.newBerryDriverTextMain')
                        currentVersion = self._updateData.versions.current.berryDriver.version
                        latestVersion = self._updateData.versions.latest.berryDriver.version

                        self.showUpdateNotification('BerryDriver', notifyTextMain, currentVersion, latestVersion)
                    }

                    if (
                        (self._updateData.versionAcquisitionStatus & VersionAcquisitionStatus.HmiUpdateAvailable) ===
                        VersionAcquisitionStatus.HmiUpdateAvailable
                    ) {
                        notifyTextMain = self._i18n('nspanel-controller.panel.newHmiTextMain')
                        currentVersion = self._updateData.versions.current.hmi.internalVersion
                        latestVersion = `${self._updateData.versions.latest.hmi.version} (${self._updateData.versions.latest.hmi.internalVersion})`

                        self.showUpdateNotification('Hmi', notifyTextMain, currentVersion, latestVersion)
                    }
                } else {
                    // TODO: initiate update process
                }
            })
            .catch((versionAcquisitionStatus) => {
                log.error(`Could not acquire version data ${versionAcquisitionStatus}`)
            })
    }

    private showUpdateNotification(
        notifyId: string,
        notifyTextMain: string,
        currentVersion: string,
        latestVersion: string
    ) {
        const instruction: string =
            notifyTextMain +
            STR_LUI_LINEBREAK +
            this._i18n('nspanel-controller.panel.currentFirmwareVersionPrefix') +
            currentVersion +
            STR_LUI_LINEBREAK +
            STR_LUI_LINEBREAK +
            this._i18n('nspanel-controller.panel.newFirmwareVersionPrefix') +
            latestVersion +
            STR_LUI_LINEBREAK +
            STR_LUI_LINEBREAK +
            this._i18n('nspanel-controller.panel.newFirmwarPerformUpdate')

        const notifyData: NotifyData = {
            notifyId: `${STR_UPDATE_NOTIFY_PREFIX}.${notifyId}`,
            icon: 'reload-alert',
            text: instruction,
            heading: this._i18n('nspanel-controller.panel.newFirmwareTitle'),
            headingColor: STR_LUI_COLOR_RED,
            timeout: 0,
            fontSize: 0,
            cancelColor: STR_LUI_COLOR_RED,
            cancelText: this._i18n('nspanel-controller.panel.btnTextNo'),
            okColor: STR_LUI_COLOR_GREEN,
            okText: this._i18n('nspanel-controller.panel.btnTextYes'),
        }
        this._panelController?.showNotification(notifyData)
    }

    private _acquireVersions(): Promise<VersionAcquisitionStatus> {
        this._updateData.versionAcquisitionStatus = VersionAcquisitionStatus.None

        this.getCurrentTasmotaVersion()
        this.getCurrentBerryDriverVersion()
        this.getCurrentHmiVersion()
        this.getLatestVersion()
        let i = 10

        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const self = this
        return new Promise((resolve, reject) => {
            ;(function waitForDataAcquisition() {
                if (
                    (self._updateData.versionAcquisitionStatus & VersionAcquisitionStatus.AllAcquired) ===
                    VersionAcquisitionStatus.AllAcquired
                ) {
                    if (
                        semver.gt(
                            self._updateData.versions.latest.tasmota.version,
                            self._updateData.versions.current.tasmota.version
                        )
                    ) {
                        self._updateData.versionAcquisitionStatus |= VersionAcquisitionStatus.TasmotaUpdateAvailable
                    }

                    if (
                        self._updateData.versions.latest.berryDriver.version >
                        self._updateData.versions.current.berryDriver.version
                    ) {
                        self._updateData.versionAcquisitionStatus |= VersionAcquisitionStatus.BerryDriverUpdateAvailable
                    }
                    if (
                        self._updateData.versions.latest.hmi.internalVersion >
                        self._updateData.versions.current.hmi.internalVersion
                    ) {
                        self._updateData.versionAcquisitionStatus |= VersionAcquisitionStatus.HmiUpdateAvailable
                    }

                    return resolve(self._updateData.versionAcquisitionStatus)
                }

                setTimeout(waitForDataAcquisition, 1000)

                i -= 1
                if (i === 0) reject(self._updateData.versionAcquisitionStatus)
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
            this._updateData.versions.current.berryDriver = { version }
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
        axios.get<GithubApiReleaseSchema>(URL_TASMOTA_RELEASES_LATEST_META, axiosRequestOptions).then((response) => {
            const { data } = response
            if (data?.tag_name != null) {
                const tasmotaVersionLatest = String.prototype.substring.call(data.tag_name, 1)
                this._updateData.versions.latest.tasmota = { version: tasmotaVersionLatest }
                this._updateData.versionAcquisitionStatus |= VersionAcquisitionStatus.TasmotaVersionLatest
                // TODO: pick right asset
            }
        })

        axios.get<string>(URL_BERRYDRIVER_LATEST, axiosRequestOptions).then((response) => {
            if (response?.data != null) {
                const match = response.data.match(BERRY_DRIVER_REGEX)

                if (match?.groups != null && match.groups['version'] != null) {
                    this._updateData.versions.latest.berryDriver = { version: `${match.groups['version']}` }
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
        }) */

        axios.get<string>(URL_NLUI_LATEST, axiosRequestOptions).then((response) => {
            if (response?.data != null) {
                const match = response.data.match(NLUI_HMI_VERSION_REGEX)

                if (match?.groups != null && match.groups['version'] != null && match.groups['internalVersion']) {
                    this._updateData.versions.latest.hmi = {
                        internalVersion: `${match.groups['internalVersion']}`,
                        version: `${match.groups['version']}`,
                    }
                    this._updateData.versionAcquisitionStatus |= VersionAcquisitionStatus.HmiVersionLatest
                }
            }
        })
    }
    // #endregion version information retrieval

    public dispose(): void {}
}
