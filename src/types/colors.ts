export type RGBColor = {
    red: number
    green: number
    blue: number
}

export type HSVColor = {
    hue: number
    saturation: number
    value: number
}

export type RGBHSVTuple = [RGBColor, HSVColor]

export type PanelColor = number | string | number[]
