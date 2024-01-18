import { IStatus, StatusCode } from '../types/types'

export class Status implements IStatus {
    private _code: StatusCode = StatusCode.OK
    private _message: string
    private _error: Error

    public static Ok(): IStatus {
        return new Status(StatusCode.OK)
    }
    public static Error(msg: string): IStatus {
        return new Status(StatusCode.ERROR, msg)
    }
    public static Warning(msg: string): IStatus {
        return new Status(StatusCode.WARNING, msg)
    }

    constructor(code: StatusCode, msg?: string, error?: Error) {
        this._code = code
        this._message = msg
        this._error = error
    }

    public getStatus(): StatusCode {
        return this._code
    }
    public getMessage(): string {
        return this._message
    }

    public getError(): Error {
        return this._error
    }

    public isOK(): boolean {
        return this._code === StatusCode.OK
    }

    public isError(): boolean {
        return this._code === StatusCode.ERROR
    }

    public isWarning(): boolean {
        return this._code === StatusCode.WARNING
    }
}
