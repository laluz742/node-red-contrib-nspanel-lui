export const STR_EMPTY: string = ''
export const STR_ENABLE: string = 'enable'
export const STR_DISABLE: string = 'disable'
export const STR_HTTP_USER_AGENT :string= 'User-Agent'
export const STR_HTTP_USER_AGENT_VALUE:string = 'node-red-contrib-nspanel-lui'


// defaults
export const DEFAULT_HMI_COLOR: number = 65535
export const DEFAULT_COLOR: string = '#ffffff'
export const DEFAULT_FONTSIZE: number = 1

// nspanel lovelace ui commands
export const STR_LUI_DELIMITER: string = '~'
export const STR_LUI_CMD_ENTITYUPDATE: string = 'entityUpd'
export const STR_LUI_CMD_ENTITYUPDATEDETAIL: string = 'entityUpdateDetail'
export const STR_LUI_CMD_PAGETYPE: string = 'pageType' + STR_LUI_DELIMITER
export const STR_LUI_CMD_TIME: string = 'time' + STR_LUI_DELIMITER
export const STR_LUI_CMD_DATE: string = 'date' + STR_LUI_DELIMITER
export const STR_LUI_CMD_DIMMODE: string = 'dimmode' + STR_LUI_DELIMITER
export const STR_LUI_CMD_TIMEOUT: string = 'timeout' + STR_LUI_DELIMITER
export const STR_LUI_CMD_ACTIVATE_STARTUP_PAGE: string = STR_LUI_CMD_PAGETYPE + 'pageStartup'
export const STR_LUI_CMD_ACTIVATE_POPUP_NOTIFY: string = STR_LUI_CMD_PAGETYPE + 'popupNotify'
export const STR_LUI_CMD_ACTIVATE_SCREENSAVER: string = STR_LUI_CMD_PAGETYPE + 'screensaver'

// tasmota commands
export const STR_TASMOTA_CMD_DETACH_RELAYS = 'SetOption73'
export const STR_TASMOTA_CMD_TELEPERIOD = 'TelePeriod'
export const STR_TASMOTA_CMD_BUZZER = 'Buzzer'
export const STR_TASMOTA_CMD_RELAY = 'Power'
export const STR_TASMOTA_CMD_STATUS = 'Status'
export const STR_TASMOTA_CMD_OTAURL = 'OtaUrl'
export const STR_TASMOTA_CMD_UPGRADE = 'Upgrade'

// berry driver commands
export const STR_BERRYDRIVER_CMD_GETVERSION = 'GetDriverVersion'
export const STR_BERRYDRIVER_CMD_FLASHNEXTION = 'FlashNextion'
export const STR_BERRYDRIVER_CMD_UPDATE = 'Backlog'

// page/card types
export const STR_PAGE_TYPE_CARD_ENTITIES: string = 'cardEntities'
export const STR_PAGE_TYPE_CARD_GRID: string = 'cardGrid'
export const STR_PAGE_TYPE_CARD_POWER: string = 'cardPower'
export const STR_PAGE_TYPE_CARD_QR: string = 'cardQR'
export const STR_PAGE_TYPE_CARD_THERMO: string = 'cardThermo'
