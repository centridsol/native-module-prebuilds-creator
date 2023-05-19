
import { PackageFetcher } from "./Operations/PackageFetcher"

export class PrebuildsCreator{
    private prebuildifyOpts:any={}
    private packageToProcess:string[]
    private distFolder:string
    
    constructor(prebuildifyOpts:any, packageToProcess:string[], distFolder:string=null){
        this.prebuildifyOpts =  prebuildifyOpts
        this.packageToProcess = packageToProcess
        this.distFolder = distFolder ? distFolder : process.cwd()
    }


    Create(){
       const packagePaths = new PackageFetcher().Fetch(this.packageToProcess)
        // TargetBuilder(packagePaths)
        // Copiers()
    }
}




