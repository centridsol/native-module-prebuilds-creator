import { Target } from "node-abi"


export type IPackagePath = {
    [packageAndVersion:string]: {
        packagePath: string
        nativeBuildPaths: string
    }
}
export type IPreBuildifyOptions = {
    arch: string,
    platform: string,
    // empty list means all
    targets: ({
        runtime:string,
        target: string
    } | { abiVersion: string})[]
    // Should it ensure all target are compilied
    strictTargets?: boolean

} 

export type IDetailedPackageToProcess = {
    packageName:string
    version?: string,
    prebuildifyProps?: Partial<IPreBuildifyOptions>
}

export type IPackagesToProcess = (IDetailedPackageToProcess | string)[]

export interface IPackageItem {
    packageName:string
    fullPackageName:string
    packageVersion:string
    mergedPrebuildifyOptions:IPreBuildifyOptions
    sourcePath:string
    prebuildPaths:string
    supportedTargetObj:ISupportedTargetObj
    SetSourcePath(pathToSet:string):void
    SetPrebuildPath(pathToSet:string):void
    SetSupportedTargetObj(supportedTargetObj:ISupportedTargetObj):void
}

export type IPackageItemsToProcess = {[packageName:string]: IPackageItem}


export type ISupportedTargetObj = {
    runtimeRestrictions: {
        node: string | null,
        electron: string | null
    },
    supportedTargets: {
        node: Target[] | null,
        electron: Target[] | null
    },
    supportedAbiVersions: string[] | null
}
