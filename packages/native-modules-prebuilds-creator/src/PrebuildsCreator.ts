
import { SharedHelpers } from "../../../Shared/Utilities/Helpers"
import { IPackageItemsToProcess, IPackagesToProcess, IPreBuildifyOptions } from "./IPrebuildsCreator"
import { PackageFetcher } from "./Operations/PackageFetcher"
import { PreBuildifyBuilder } from "./Operations/PreBuildifyBuilder"
import { PreBuildsCopier } from "./Operations/PreBuildsCopier"
import { PackageItem } from "./PackageItem"
import {Consts} from "./Utilities/Consts"

export class PrebuildsCreator{
    private gloablPrebuildifyOpts:any={}
    private packagesToProcess: IPackageItemsToProcess = {}
    private distFolder:string
    private logger:any
    
    constructor(gloablPrebuildifyOpts:IPreBuildifyOptions, packageToProcess:IPackagesToProcess, distFolder:string=null){
        this.logger = SharedHelpers.GetLoggger(Consts.LOGGER_NAMES.MAIN)
        this.gloablPrebuildifyOpts =  this.SetDefaults(gloablPrebuildifyOpts)
        this.distFolder = distFolder ? distFolder : process.cwd()
        this.LoadPackagesToProcess(packageToProcess)
    }

    private SetDefaults(globalPrebuildifyOpts:IPreBuildifyOptions){
        globalPrebuildifyOpts.onUnsupportedTargets = globalPrebuildifyOpts.onUnsupportedTargets ? globalPrebuildifyOpts.onUnsupportedTargets : 'force'
        globalPrebuildifyOpts.includePreReleaseTargets = (globalPrebuildifyOpts.includePreReleaseTargets === undefined || globalPrebuildifyOpts.includePreReleaseTargets === null) ? true : globalPrebuildifyOpts.includePreReleaseTargets
        return globalPrebuildifyOpts
    }

    LoadPackagesToProcess(packageToProcess:IPackagesToProcess){
        for (const packageDetails of packageToProcess){
            const packageDetailsCls = new PackageItem(packageDetails, this.gloablPrebuildifyOpts)
            this.packagesToProcess[`${packageDetailsCls.packageName}@${packageDetailsCls.packageFetchVersion}`] = packageDetailsCls
        }
    }

    async Create(){
        try{
            await new PackageFetcher().Fetch(this.packagesToProcess)
            await new PreBuildifyBuilder(this.packagesToProcess).BuildAll()
            new PreBuildsCopier(this.packagesToProcess).Copy(this.distFolder)
            this.logger.info(`Prebuilds created.`)
        }
        catch(err:any){
            this.logger.error(err.message || err)
        }
        

    }
}
