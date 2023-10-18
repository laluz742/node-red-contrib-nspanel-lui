import { IPageCache } from '@types'

export class SimplePageCache implements IPageCache {
    private _data: string | string[] | null

    public clear(): void {
        this._data = null
    }

    public put(data: string | string[] | null): void {
        this._data = data
    }

    public get(): string | string[] | null {
        return this._data
    }

    public containsData(): boolean {
        return this._data != null
    }
}
