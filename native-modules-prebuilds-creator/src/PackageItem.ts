import { IDetailedPackageToProcess, IPackageItem, IPreBuildifyOptions, ISupportedTargetObj } from "./IPrebuildsCreator"


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


    constructor(packageDetails:(IDetailedPackageToProcess | string), gloablPrebuildifyOpts:IPreBuildifyOptions){
        if (typeof packageDetails === "string"){
            this._packageName = packageDetails
            this._mergedPrebuildifyOptions = gloablPrebuildifyOpts
        }
        else{
            const packagedDetailsObj = packageDetails as IDetailedPackageToProcess
            this._packageName = packagedDetailsObj.packageName
            this._packageVersion = packageDetails.version || null
            this._mergedPrebuildifyOptions = {...gloablPrebuildifyOpts, ...(packagedDetailsObj.prebuildifyProps || {})}
        }
        this._fullPackageName = this.packageVersion ? `${this.packageName}@${this.packageVersion}` : `${this.packageName}@lastest`
    }
    
    SetSupportedTargetObj(supportedTargetObj: ISupportedTargetObj): void {
        this._supportedTargetObj = supportedTargetObj
    }

    SetSourcePath(pathToSet:string){
        this._sourcePath = pathToSet
    }

    SetPrebuildPath(pathToSet:string){
        this._prebuildPaths = pathToSet
    }
    
    
}

