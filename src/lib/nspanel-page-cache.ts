import { HMICommand, IPageCache } from '../types/types'

export class SimplePageCache implements IPageCache {
    private _data: HMICommand | HMICommand[] | null

    public clear(): void {
        this._data = null
    }

    public put(data: HMICommand | HMICommand[] | null): void {
        this._data = data
    }

    public get(): HMICommand | HMICommand[] | null {
        return this._data
    }

    public containsData(): boolean {
        return this._data != null
    }
}
