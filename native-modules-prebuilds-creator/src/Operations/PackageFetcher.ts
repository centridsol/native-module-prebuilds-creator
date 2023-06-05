import os from "os"
import path from "path"
import fs from "fs"
import decompress from "decompress"
import { Consts } from "../Utilities/Consts"
import { Helpers } from "../Utilities/Helpers"
import { IPackageItemsToProcess, IPackagePath } from "../IPrebuildsCreator"


export class PackageFetcher{
    private tempOutDir:string

    constructor(){
        this.tempOutDir = path.join(os.tmpdir(), Consts.TEMP_DIR_NAME)
        console.log(`Using temp directory '${this.tempOutDir}'`)
    }

    async Fetch(packageToProcess:IPackageItemsToProcess):Promise<IPackagePath>{
        const packagePaths:IPackagePath = {}

        for(const packageTP of Object.values(packageToProcess)){
            const packageSafeName = Helpers.MakeNameSafe(packageTP.fullPackageName)
            const outputFolderPath:string = path.join(this.tempOutDir, packageSafeName)

            if (this.CheckIfAlreadyFetched(outputFolderPath, packageTP.fullPackageName)){
                console.log(`Package ${packageTP.fullPackageName} already fetched. Skipping refetching`)
            }
            else{
                console.log(`Fetching ${packageTP.fullPackageName}...`)
                if (!fs.existsSync(outputFolderPath)){
                    fs.mkdirSync(outputFolderPath, {recursive: true})
                }
                Helpers.SpwanFetchPackage(packageTP.fullPackageName, outputFolderPath)
            }

            console.log(`Extracting ${packageTP.fullPackageName}...`)
            const extractedPath:string = await this.ExtractPackage(outputFolderPath, packageTP.fullPackageName)

            //TODO: Do repeat this if already there
            // Also maybe use workspaces 
            console.log(`Installing depencies for ${packageTP}`)
            Helpers.InstallDependencies(packageTP.fullPackageName, extractedPath)

            packageToProcess[packageTP.fullPackageName].SetSourcePath(extractedPath)

            
        }
        
        return packagePaths
    }

    private CheckIfAlreadyFetched(outputFolder:string, packageName:string){
        if (!fs.existsSync(outputFolder)){
            return false
        }

        return Helpers.GetCompressedPackage(outputFolder, packageName)
    }

    private async ExtractPackage(outputFolder:string, packageName:string){

        const pathToExtract:string = Helpers.GetCompressedPackage(outputFolder, packageName)
        await decompress(pathToExtract, outputFolder)

        return path.join(outputFolder, "package")
    }
}