export type INativeModuleToPatchDetails = {
    name: string,
    version: string,
    path: string,
    prebuildsPath?:string,
    prebuildsArchAndPlatformPath?:string,
    prebuildsArchAndPlatformAbiPath?:string
}

export type INativeModuleToPatch = { [packageName:string]: INativeModuleToPatchDetails}

export interface IPatchStrategies{
    IsApplicable(): boolean
    Patch(): boolean
}