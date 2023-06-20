export type INativeModuleToPatchDetails = {
    name: string,
    version: string,
    path: string,
    prebuildsPath?:string | null,
    prebuildsArchAndPlatformPath?:string | null,
    prebuildsArchAndPlatformAbiPath?:string | null
}

export type INativeModuleToPatch = { [packageName:string]: INativeModuleToPatchDetails}

export interface IPatchStrategies{
    IsApplicable(): boolean
    Patch(): boolean
}