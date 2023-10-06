import { HSVColor, RGBColor } from '../types'
import { DEFAULT_HMI_COLOR } from './nspanel-constants'

const colorRegex =
    /#(?<hexColor>(?<hexAlpha>[a-f\d]{2})?(?<hexRed>[a-f\d]{2})(?<hexGreen>[a-f\d]{2})(?<hexBlue>[a-f\d]{2}))|rgb\((?<rgbColor>(?<rgbRed>0|255|25[0-4]|2[0-4]\d|1\d\d|0?\d?\d),(?<rgbGreen>0|255|25[0-4]|2[0-4]\d|1\d\d|0?\d?\d),(?<rgbBlue>0|255|25[0-4]|2[0-4]\d|1\d\d|0?\d?\d))\)/

export class NSPanelColorUtils {
    public static color2dec565(color: string | number[], defaultColor: number = DEFAULT_HMI_COLOR): number {
        var r = -1,
            g = -1,
            b = -1

        if (typeof color === 'string') {
            const colorStr = color.toLowerCase()
            const match = colorStr.match(colorRegex)
            if (match == null || match.groups == null) return -1

            //TODO: alpha
            if (match.groups['hexColor'] !== undefined) {
                r = Number('0x' + match.groups['hexRed'])
                g = Number('0x' + match.groups['hexGreen'])
                b = Number('0x' + match.groups['hexBlue'])
            } else if (match.groups['rgbColor'] !== undefined) {
                r = Number(match.groups['rgbRed'])
                g = Number(match.groups['rgbGreen'])
                b = Number(match.groups['rgbBlue'])
            }

            r = isNaN(r) ? -1 : r
            g = isNaN(g) ? -1 : g
            b = isNaN(b) ? -1 : b
        } else if (Array.isArray(color)) {
            r = color[0]
            g = color[0]
            b = color[0]
        }

        var dec = ((r >> 3) << 11) | ((g >> 2) << 5) | (b >> 3)
        dec = dec == -1 ? defaultColor : dec

        return dec
    }

    public static hsv2Rgb(hsv: HSVColor): RGBColor {
        const tmpHue = hsv.hue / 60
        const chroma = hsv.value * hsv.saturation

        const x = chroma * (1 - Math.abs((tmpHue % 2) - 1))
        var rgb =
            tmpHue <= 1
                ? [chroma, x, 0]
                : tmpHue <= 2
                ? [x, chroma, 0]
                : tmpHue <= 3
                ? [0, chroma, x]
                : tmpHue <= 4
                ? [0, x, chroma]
                : tmpHue <= 5
                ? [x, 0, chroma]
                : [chroma, 0, x]

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