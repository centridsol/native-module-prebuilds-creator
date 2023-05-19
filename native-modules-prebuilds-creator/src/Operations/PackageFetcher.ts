import os from "os"
import path from "path"
import fs from "fs"
import decompress from "decompress"
import { Consts } from "../Utilities/Consts"
import { Helpers } from "../Utilities/Helpers"


export class PackageFetcher{
    private tempOutDir:string

    constructor(){
        this.tempOutDir = path.join(os.tmpdir(), Consts.TEMP_DIR_NAME)
        console.log(`Using temp directory '${this.tempOutDir}'`)
    }

    async Fetch(packageToProcess:string[]){
        const packagePaths:any = {}

        for(const packageName of packageToProcess){
            const packageSafeName = Helpers.MakeNameSafe(packageName)
            const outputFolderPath:string = path.join(this.tempOutDir, packageSafeName)

            if (this.CheckIfAlreadyFetched(outputFolderPath, packageName)){
                console.log(`Package ${packageName} already fetched. Skipping refetching`)
            }
            else{
                console.log(`Fetching ${packageName}...`)
                if (!fs.existsSync(outputFolderPath)){
                    fs.mkdirSync(outputFolderPath, {recursive: true})
                }
                Helpers.SpwanFetchPackage(packageName, outputFolderPath)
            }

            console.log(`Extracting ${packageName}...`)
            packagePaths[packageName] = await this.ExtractPackage(outputFolderPath, packageName)
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