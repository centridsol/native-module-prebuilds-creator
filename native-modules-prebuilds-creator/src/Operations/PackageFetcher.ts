import os from "os"
import path from "path"
import fsExtra from "fs-extra"
import decompress from "decompress"
import { Consts } from "../Utilities/Consts"
import { Helpers } from "../Utilities/Helpers"
import { IPackageItem, IPackageItemsToProcess } from "../IPrebuildsCreator"


export class PackageFetcher{
    private tempOutDir:string
    private tempDowloadFolder:string
    private tempExtractFolder:string
    private tempNodeModules:string
    
    constructor(){
        this.tempOutDir = path.join(os.tmpdir(), Consts.TEMP_DIR_NAME)
        this.tempDowloadFolder = path.join(this.tempOutDir, "download")
        this.tempExtractFolder = path.join(this.tempOutDir, "extract")

        this.tempNodeModules = path.join(this.tempExtractFolder, "node_modules")
        if (!fsExtra.existsSync(this.tempNodeModules)){
            fsExtra.mkdirSync(this.tempNodeModules, {recursive: true})
        }

        console.log(`Using temp directory '${this.tempOutDir}'`)
    }

    async Fetch(packageToProcess:IPackageItemsToProcess){

        for(const packageTP of Object.values(packageToProcess)){
            packageTP.SetOtherPackageDetails(Helpers.GetPackageDetails(packageTP))
            
            const downloadFolderPath:string = path.join(this.tempDowloadFolder, Helpers.MakeNameSafe(packageTP.fullPackageName))

            if (this.CheckIfAlreadyFetched(downloadFolderPath, packageTP)){
                console.log(`Package ${packageTP.fullPackageName} already fetched. Skipping refetching`)
            }
            else{
                console.log(`Fetching ${packageTP.fullPackageName}...`)
                if (!fsExtra.existsSync(downloadFolderPath)){
                    fsExtra.mkdirSync(downloadFolderPath, {recursive: true})
                }
                Helpers.SpwanFetchPackage(packageTP.fullPackageName, downloadFolderPath)
            }

            console.log(`Extracting ${packageTP.fullPackageName}...`)
            const extractedPath:string = await this.ExtractPackage(downloadFolderPath, packageTP)

            console.log(`Installing depencies for ${packageTP.fullPackageName}`)
            Helpers.InstallDependencies(packageTP.fullPackageName, extractedPath)

            packageTP.SetSourcePath(extractedPath)
            packageTP.SetPackageJson(JSON.parse(fsExtra.readFileSync(path.join(extractedPath, "package.json")).toString()))

        }
        
    }

    private CheckIfAlreadyFetched(outputFolder:string, packageItem:IPackageItem){
        const downloadPath:string = path.join(outputFolder, packageItem.tarballName)
        if (!fsExtra.existsSync(downloadPath)){
            return false
        }
        return downloadPath
    }

    private async ExtractPackage(downloadFolderPath:string, packageItem:IPackageItem){

        const pathToExtract:string = path.join(downloadFolderPath, packageItem.tarballName)
        await decompress(pathToExtract, downloadFolderPath)

        const extractedOutPath:string = path.join(this.tempExtractFolder, Helpers.MakeNameSafe(packageItem.fullPackageName))
        fsExtra.moveSync(path.join(downloadFolderPath, "package"), extractedOutPath, {overwrite: true})

        const packageNodeModule:string = path.join(extractedOutPath, "node_modules")
        fsExtra.symlinkSync(this.tempNodeModules, packageNodeModule )

        return extractedOutPath
    }
}