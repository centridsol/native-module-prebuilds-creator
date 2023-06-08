import { Target } from "node-abi"


export type IPreBuildifyOptions = {
    arch: string,
    platform: string,
    // empty list means all
    targets: ({
        runtime:string,
        target: string
    } | { abiVersion: string})[]
    // Should it ensure all target are compilied
    onUnsupportedTargets?: 'error' | 'skip' | 'force' 
    includePreReleaseTargets?: boolean

} 

export type IDetailedPackageToProcess = {
    packageName:string
    version?: string,
    prebuildifyProps?: Partial<IPreBuildifyOptions>
}

export type IPackagesToProcess = (IDetailedPackageToProcess | string)[]

export type IFetchedPackageDetails = {
    tarball_url: string,
    id:string,
    version: string
}
export interface IPackageItem {
    tarballName:string
    tarballUrl:string
    packageName:string
    packageFetchVersion:string
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
    SetOtherPackageDetails(packageDetails: IFetchedPackageDetails):IPackageItem
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
