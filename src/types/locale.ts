export type RegionalSettings = {
    locale: string

    useCustomDate: boolean
    useCustomDateTimeFormat: boolean

    dateCustomFormat: string
    dateFormatWeekday: 'short' | 'long'
    dateFormatDay: 'numeric' | '2-digit'
    dateFormatMonth: 'numeric' | '2-digit' | 'short' | 'long'
    dateFormatYear: 'numeric' | '2-digit'

    timeFormatShowAmPm: boolean
    use12HourClock: boolean
    timeFormatHour: 'numeric' | '2-digit'
    timeFormatMinute: 'numeric' | '2-digit'
    timeCustomFormat: string
}
