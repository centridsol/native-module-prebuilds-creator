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
    CanPatch(): boolean
    Patch(): boolean
}

export interface IPactherOptions{
    forceRebuildOnNoBindings?: boolean,
    shouldBackup?: boolean
    backUpFolderPath?: string
    onPatchFail?: 'error' | 'skip'
}