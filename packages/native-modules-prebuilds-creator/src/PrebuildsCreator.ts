
import { IPackageItemsToProcess, IPackagesToProcess, IPreBuildifyOptions } from "./IPrebuildsCreator"
import { PackageFetcher } from "./Operations/PackageFetcher"
import { PreBuildifyBuilder } from "./Operations/PreBuildifyBuilder"
import { PreBuildsCopier } from "./Operations/PreBuildsCopier"
import { PackageItem } from "./PackageItem"

export class PrebuildsCreator{
    private gloablPrebuildifyOpts:any={}
    private packagesToProcess: IPackageItemsToProcess = {}
    private distFolder:string
    
    constructor(gloablPrebuildifyOpts:IPreBuildifyOptions, packageToProcess:IPackagesToProcess, distFolder:string=null){
        this.gloablPrebuildifyOpts =  gloablPrebuildifyOpts
        this.distFolder = distFolder ? distFolder : process.cwd()
        this.LoadPackagesToProcess(packageToProcess)
    }

    LoadPackagesToProcess(packageToProcess:IPackagesToProcess){
        for (const packageDetails of packageToProcess){
            const packageDetailsCls = new PackageItem(packageDetails, this.gloablPrebuildifyOpts)
            this.packagesToProcess[`${packageDetailsCls.packageName}@${packageDetailsCls.packageFetchVersion}`] = packageDetailsCls
        }
    }

    async Create(){
        await new PackageFetcher().Fetch(this.packagesToProcess)
        await new PreBuildifyBuilder(this.packagesToProcess).BuildAll()
        new PreBuildsCopier(this.packagesToProcess).Copy(this.distFolder)

    }
}
