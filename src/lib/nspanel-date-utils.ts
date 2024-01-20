import dayjs from 'dayjs'
import 'dayjs/locale/de'
import 'dayjs/locale/en'
import 'dayjs/locale/zh-cn'
import 'dayjs/locale/zh-tw'
import 'dayjs/locale/fr'
import 'dayjs/locale/ja'
import 'dayjs/locale/ko'
import 'dayjs/locale/pt-br'
import 'dayjs/locale/ru'
import 'dayjs/locale/nl'

import { Logger } from './logger'
import * as NSPanelConstants from './nspanel-constants'

const DEFAULT_DATE_OPTIONS: Intl.DateTimeFormatOptions = {
    weekday: 'long', // short
    year: 'numeric',
    month: 'long', // short
    day: 'numeric',
}
const DEFAULT_TIME_OPTIONS: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
}

const log = Logger('NSPanelDateUtils')

export class NSPanelDateUtils {
    public static setGlobalLocale(locale: string) {
        dayjs.locale(locale?.toLowerCase() ?? NSPanelConstants.DEFAULT_DATE_LOCALE)
    }

    public static isToday(date: Date): boolean {
        const today = new Date()
        return (
            today.getDate() === date.getDate() &&
            today.getMonth() === date.getMonth() &&
            today.getFullYear() === date.getFullYear()
        )
    }

    public static format(date: Date, format: string, locale?: string): string {
        const timeStr = dayjs(date ?? new Date())
            .locale(locale ?? NSPanelConstants.DEFAULT_DATE_LOCALE)
            ?.format(format)

        return timeStr
    }

    public static formatTime(
        date: Date,
        locale: string,
        timeFormatHour?: 'numeric' | '2-digit',
        _timeFormatMinute?: 'numeric' | '2-digit',
        use12HourClock: boolean = false
    ): string {
        const timeMinuteFormat = 'mm'
        let timeHourFormat
        let timeStr

        try {
            timeHourFormat = timeFormatHour === '2-digit' ? 'hh' : 'h'
            if (use12HourClock === false) {
                timeHourFormat = timeHourFormat.toUpperCase()
            }

            let day = dayjs(date)
            if (locale != null) {
                day = day.locale(locale)
            }

            timeStr = day.format(`${timeHourFormat}:${timeMinuteFormat}`)
        } catch {
            log.error('Invalid time format configuration, using default settings')
            timeStr = date.toLocaleTimeString(undefined, DEFAULT_TIME_OPTIONS)
        }

        return timeStr
    }

    public static formatDate(
        date: Date,
        locale: string,
        dateFormatYear: 'numeric' | '2-digit',
        dateFormatMonth: 'numeric' | '2-digit' | 'short' | 'long',
        dateFormatDay: 'numeric' | '2-digit',
        dateFormatWeekday: 'short' | 'long'
    ): string {
        const dateOptions: Intl.DateTimeFormatOptions = { ...DEFAULT_DATE_OPTIONS }
        let dateStr
        try {
            if (dateFormatYear != null) dateOptions.year = dateFormatYear
            if (dateFormatMonth != null) dateOptions.month = dateFormatMonth
            if (dateFormatDay != null) dateOptions.day = dateFormatDay
            if (dateFormatWeekday != null) dateOptions.weekday = dateFormatWeekday

            dateStr = date.toLocaleDateString(locale, dateOptions)
        } catch (error) {
            log.error('Invalid date format configuration, using default settings')
            dateStr = date.toLocaleDateString(undefined, DEFAULT_DATE_OPTIONS)
        }

        return dateStr
    }

    public static toDate(input: any): Date | null {
        const date = new Date(input)
        if (Number.isNaN(date.getTime()) === false) {
            return date
        }

        return null
    }
}
