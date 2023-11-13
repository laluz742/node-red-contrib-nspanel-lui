export type HMICommandParameters = (string | number) | (string | number)[]

export type HMICommand = {
    cmd: string
    params: HMICommandParameters
}
