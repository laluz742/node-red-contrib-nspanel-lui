export declare type Nullable<T> = T | null

export interface IDisposable {
    dispose(): void
}

export declare type SplitTime = {
    hours: number
    minutes: number
}

export type StatusLevel = 'error' | 'warn' | 'info' | 'success' | null

export type ActiveCharacteristic = boolean | 0 | 1 | '0' | '1'

export type PageId = string
