import { HSVColor, RGBColor, RGBHSVTuple } from '../types/types'
import { DEFAULT_LUI_COLOR } from './nspanel-constants'

const colorRegex =
    /#(?<hexColor>(?<hexAlpha>[a-f\d]{2})?(?<hexRed>[a-f\d]{2})(?<hexGreen>[a-f\d]{2})(?<hexBlue>[a-f\d]{2}))|rgb\((?<rgbColor>(?<rgbRed>0|255|25[0-4]|2[0-4]\d|1\d\d|0?\d?\d),(?<rgbGreen>0|255|25[0-4]|2[0-4]\d|1\d\d|0?\d?\d),(?<rgbBlue>0|255|25[0-4]|2[0-4]\d|1\d\d|0?\d?\d))\)/

export class NSPanelColorUtils {
    public static toHmiIconColor(color: string | number | number[], defaultColor: number = DEFAULT_LUI_COLOR): number {
        const result = Number(color)
        if (!Number.isNaN(result)) return result

        if (typeof color === 'string' || Array.isArray(color)) {
            return NSPanelColorUtils.color2dec565(color, defaultColor)
        }

        return defaultColor
    }

    public static hmiPosToColor(x: number, y: number): RGBHSVTuple {
        let r = 160 / 2
        x = Math.round(((x - r) / r) * 100) / 100
        y = Math.round(((r - y) / r) * 100) / 100

        r = Math.sqrt(x * x + y * y)
        let saturation = 0
        if (r > 1) {
            saturation = 0
        } else {
            saturation = r
        }

        const hue = NSPanelColorUtils.rad2deg(Math.atan2(y, x))
        const hsv: HSVColor = { hue, saturation, value: 1 } // FIXME: brightness input
        const rgb: RGBColor = NSPanelColorUtils.hsv2Rgb(hsv)

        return [rgb, hsv]
    }

    public static color2dec565(color: string | number[], defaultColor: number = DEFAULT_LUI_COLOR): number {
        let r = -1
        let g = -1
        let b = -1

        if (typeof color === 'string') {
            const colorStr = color.toLowerCase()
            const match = colorStr.match(colorRegex)
            if (match == null || match.groups == null) return -1

            // TODO: alpha
            if (match.groups['hexColor'] !== undefined) {
                r = Number(`0x${match.groups['hexRed']}`)
                g = Number(`0x${match.groups['hexGreen']}`)
                b = Number(`0x${match.groups['hexBlue']}`)
            } else if (match.groups['rgbColor'] !== undefined) {
                r = Number(match.groups['rgbRed'])
                g = Number(match.groups['rgbGreen'])
                b = Number(match.groups['rgbBlue'])
            }

            r = Number.isNaN(r) ? -1 : r
            g = Number.isNaN(g) ? -1 : g
            b = Number.isNaN(b) ? -1 : b
        } else if (Array.isArray(color)) {
            r = color[0]
            g = color[0]
            b = color[0]
        }

        let dec = ((r >> 3) << 11) | ((g >> 2) << 5) | (b >> 3)
        dec = dec === -1 ? defaultColor : dec

        return dec
    }

    public static hsv2Rgb(hsv: HSVColor): RGBColor {
        const tmpHue = hsv.hue / 60
        const chroma = hsv.value * hsv.saturation

        const x = chroma * (1 - Math.abs((tmpHue % 2) - 1))
        let rgb: number[]
        if (tmpHue <= 1) {
            rgb = [chroma, x, 0]
        } else if (tmpHue <= 2) {
            rgb = [x, chroma, 0]
        } else if (tmpHue <= 3) {
            rgb = [0, chroma, x]
        } else if (tmpHue <= 4) {
            rgb = [0, x, chroma]
        } else if (tmpHue <= 5) {
            rgb = [x, 0, chroma]
        } else {
            rgb = [chroma, 0, x]
        }

        const m = hsv.value - chroma
        rgb = rgb.map((v) => Math.round((v + m) * 255))

        return {
            red: rgb[0],
            green: rgb[1],
            blue: rgb[2],
        }
    }

    public static rad2deg(rad: number): number {
        return (360 + (180 * rad) / Math.PI) % 360
    }
}
