import lodash from "lodash"
import { IDetailedPackageToProcess, IFetchedPackageDetails, IPackageItem, IPreBuildifyOptions, ISupportedTargetObj } from "./IPrebuildsCreator"
import path from "path"

export class PackageItem implements IPackageItem{

    private _fullPackageName:string
    get fullPackageName(): string{
        return this._fullPackageName
    }

    private _packageName:string
    get packageName(): string{
        return this._packageName
    }

    private _packageVersion:string
    get packageVersion(): string{
        return this._packageVersion
    }

    private _tarballName:string
    get tarballName(): string{
        return this._tarballName
    }

    private _tarballUrl:string
    get tarballUrl(): string{
        return this._tarballUrl
    }

    private _packageFetchVersion:string
    get packageFetchVersion(): string{
        return this._packageFetchVersion
    }
    

    private _mergedPrebuildifyOptions:IPreBuildifyOptions
    get mergedPrebuildifyOptions(): IPreBuildifyOptions{
        return this._mergedPrebuildifyOptions
    }


    private _sourcePath:string
    get sourcePath(): string{
        return this._sourcePath
    }

    private _prebuildPaths:string
    get prebuildPaths(): string{
        return this._prebuildPaths
    }

    private _supportedTargetObj:ISupportedTargetObj
    get supportedTargetObj(): ISupportedTargetObj{
        return this._supportedTargetObj
    }

    private _packageJson:any
    get packageJson(): any{
        return this._packageJson
    }


    constructor(packageDetails:(IDetailedPackageToProcess | string), gloablPrebuildifyOpts:IPreBuildifyOptions){
        if (typeof packageDetails === "string"){
            if (packageDetails.includes("@")){
                const packageDetailsInfo = packageDetails.split("@")
                this._packageName = packageDetailsInfo[0]
                this._packageFetchVersion = packageDetailsInfo[1]
            }
            else{
                this._packageName = packageDetails
                this._packageFetchVersion = "latest"
            }
            this._mergedPrebuildifyOptions = lodash.cloneDeep(gloablPrebuildifyOpts)
        }
        else{
            const packagedDetailsObj = packageDetails as IDetailedPackageToProcess
            this._packageName = packagedDetailsObj.packageName
            this._packageFetchVersion = packageDetails.version || "latest"
            this._mergedPrebuildifyOptions = {...lodash.cloneDeep(gloablPrebuildifyOpts), ...(packagedDetailsObj.prebuildifyProps || {})}
        }
        
    }
    
    SetSupportedTargetObj(supportedTargetObj: ISupportedTargetObj) {
        this._supportedTargetObj = supportedTargetObj
        return this
    }

    SetSourcePath(pathToSet:string){
        this._sourcePath = pathToSet
        return this
    }

    SetPrebuildPath(pathToSet:string){
        this._prebuildPaths = pathToSet
        return this
    }
    
    SetOtherPackageDetails(viewPackageDetails: IFetchedPackageDetails){
        this._fullPackageName = viewPackageDetails.id
        this._packageVersion = viewPackageDetails.version
        this._tarballUrl = viewPackageDetails.tarball_url
        this._tarballName = path.basename(viewPackageDetails.tarball_url)
        return this
    }

    SetPackageJson(packageJson:any){
        this._packageJson = packageJson
        return this
    }

    
}

