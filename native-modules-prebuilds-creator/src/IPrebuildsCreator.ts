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
    strictTargets?: boolean // 'error', 'skip', 'force'
    includePreReleaseTargets?: boolean

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
    packageJson:any
    SetSourcePath(pathToSet:string):IPackageItem
    SetPrebuildPath(pathToSet:string):IPackageItem
    SetSupportedTargetObj(supportedTargetObj:ISupportedTargetObj):IPackageItem
    SetPackageJson(packageJson:any):IPackageItem
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
