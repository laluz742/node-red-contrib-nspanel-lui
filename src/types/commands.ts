export type TasmotaCommand = {
    cmd: string
    data: string
}

export type HMICommandParameters = (string | number) | (string | number)[]
export type HMICommand = {
    cmd: string
    params: HMICommandParameters
}
