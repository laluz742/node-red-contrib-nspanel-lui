import { FirmwareType } from '../types/events'

export const STR_EMPTY: string = ''
export const STR_ENABLE: string = 'enable'
export const STR_DISABLE: string = 'disable'
export const STR_HTTP_USER_AGENT: string = 'User-Agent'
export const STR_HTTP_USER_AGENT_VALUE: string = 'node-red-contrib-nspanel-lui'
export const STR_NAV_ID_PREVIOUS: string = 'nav.prev'
export const STR_NAV_ID_NEXT: string = 'nav.next'

// nspanel lovelace ui / HMI
export const STR_LUI_LINEBREAK: string = '\r\n'
export const STR_LUI_DELIMITER: string = '~'
export const STR_LUI_COLOR_RED: number = 63488
export const STR_LUI_COLOR_GREEN: number = 2016
export const STR_LUI_COLOR_WHITE: number = 65535
export const STR_LUI_CMD_SUCCESS: string = 'Done'
export const STR_LUI_CMD_ENTITYUPDATE: string = 'entityUpd'
export const STR_LUI_CMD_ENTITYUPDATEDETAIL: string = 'entityUpdateDetail'
export const STR_LUI_CMD_PAGETYPE: string = `pageType${STR_LUI_DELIMITER}`
export const STR_LUI_CMD_TIME: string = `time${STR_LUI_DELIMITER}`
export const STR_LUI_CMD_DATE: string = `date${STR_LUI_DELIMITER}`
export const STR_LUI_CMD_DIMMODE: string = `dimmode${STR_LUI_DELIMITER}`
export const STR_LUI_CMD_TIMEOUT: string = `timeout${STR_LUI_DELIMITER}`
export const STR_LUI_CMD_ACTIVATE_STARTUP_PAGE: string = `${STR_LUI_CMD_PAGETYPE}pageStartup`
export const STR_LUI_CMD_ACTIVATE_POPUP_NOTIFY: string = `${STR_LUI_CMD_PAGETYPE}popupNotify`
export const STR_LUI_CMD_ACTIVATE_SCREENSAVER: string = `${STR_LUI_CMD_PAGETYPE}screensaver`
export const STR_LUI_EVENT_BEXIT: string = 'bExit'
export const STR_LUI_EVENT_NOTIFY_ACTION: string = 'notifyAction'
export const STR_LUI_EVENT_BUTTONPRESS2: string = 'buttonPress2'
export const STR_LUI_EVENT_PAGEOPENDETAIL: string = 'pageOpenDetail'
export const STR_LUI_EVENT_SLEEPREACHED: string = 'sleepReached'
export const STR_LUI_EVENT_STARTUP: string = 'startup'
export const STR_LUI_NOTIFY_ACTION_YES: string = 'yes'
export const STR_LUI_NOTIFY_ACTION_NO: string = 'no'
export const STR_LUI_ENTITY_NONE: string = 'delete'
export const STR_LUI_ENTITY_BUTTON: string = 'button'
export const STR_LUI_ENTITY_SHUTTER: string = 'shutter'
export const STR_LUI_ENTITY_LIGHT: string = 'light'
export const STR_LUI_ENTITY_FAN: string = 'fan'
export const STR_LUI_ENTITY_INPUTSEL: string = 'input_sel'
export const STR_LUI_ENTITY_TIMER: string = 'timer'
export const STR_LUI_ENTITY_SWITCH: string = 'switch'
export const STR_LUI_ENTITY_TEXT: string = 'text'
export const STR_LUI_ENTITY_NUMBER: string = 'number'

// tasmota
export const STR_TASMOTA_CMD_DETACH_RELAYS: string = 'SetOption73'
export const STR_TASMOTA_CMD_TELEPERIOD: string = 'TelePeriod'
export const STR_TASMOTA_CMD_BUZZER: string = 'Buzzer'
export const STR_TASMOTA_CMD_RELAY: string = 'Power'
export const STR_TASMOTA_CMD_STATUS: string = 'Status'
export const STR_TASMOTA_CMD_OTAURL: string = 'OtaUrl'
export const STR_TASMOTA_CMD_UPGRADE: string = 'Upgrade'
export const STR_TASMOTA_CMD_BACKLOG: string = 'Backlog'
export const STR_TASMOTA_CMD_RESTART: string = 'Restart'
export const STR_TASMOTA_PARAM_RELAY_TOGGLE: string = 'TOGGLE'
export const STR_TASMOTA_PARAM_RESTART_SAVE_TO_FLASH: string = '1'
export const STR_TASMOTA_UPGRADE_SUCCESSFUL: string = 'Successful'
export const STR_TASMOTA_UPGRADE_FAILED: string = 'Failed'
export const STR_TASMOTA_MSG_UPGRADE: string = 'Upgrade'

// berry driver
export const STR_BERRYDRIVER_CMD_GETVERSION: string = 'GetDriverVersion'
export const STR_BERRYDRIVER_CMD_UPDATEDRIVER: string = 'UpdateDriverVersion'
export const STR_BERRYDRIVER_CMD_FLASHNEXTION: string = 'FlashNextion'

// page/card types
export const STR_PAGE_TYPE_CARD_ENTITIES: string = 'cardEntities'
export const STR_PAGE_TYPE_CARD_GRID: string = 'cardGrid'
export const STR_PAGE_TYPE_CARD_GRID2: string = 'cardGrid2'
export const STR_PAGE_TYPE_CARD_MEDIA: string = 'cardMedia'
export const STR_PAGE_TYPE_CARD_POWER: string = 'cardPower'
export const STR_PAGE_TYPE_CARD_QR: string = 'cardQR'
export const STR_PAGE_TYPE_CARD_THERMO: string = 'cardThermo'

// update process
export const FIRMWARE_TASMOTA: FirmwareType = 'tasmota'
export const FIRMWARE_BERRYDRIVER: FirmwareType = 'nlui'
export const FIRMWARE_HMI: FirmwareType = 'hmi'
export const STR_FIRMWARE_LABEL_TASMOTA: string = 'Tasmota'
export const STR_FIRMWARE_LABEL_BERRYDRIVER: string = 'Berry Driver'
export const STR_FIRMWARE_LABEL_HMI: string = 'Display Firmware'
export const STR_UPDATE_NOTIFY_ID_PREFIX: string = 'notifyUpdate.'
export const STR_UPDATE_NOTIFY_ID_ERROR_PREFIX: string = 'notifyUpdate.failed.'
export const STR_UPDATE_FIRMWARE_TASMOTA: string = FIRMWARE_TASMOTA as string
export const STR_UPDATE_FIRMWARE_BERRYDRIVER: string = FIRMWARE_BERRYDRIVER as string
export const STR_UPDATE_FIRMWARE_HMI: string = FIRMWARE_HMI as string
export const STR_UPDATE_NOTIFY_ICON: string = 'reload-alert'
export const STR_UPDATE_ERROR_ICON: string = 'exclamation-thick'

// defaults
export const DEFAULT_LUI_COLOR: number = STR_LUI_COLOR_WHITE
export const DEFAULT_COLOR: string = '#ffffff'
export const DEFAULT_FONTSIZE: number = 1
