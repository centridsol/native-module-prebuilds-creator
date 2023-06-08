import {  IPackageItem, IPackageItemsToProcess } from "../IPrebuildsCreator"
import fsExtra from "fs-extra"
import path from "path"

export class PreBuildsCopier{

    private packagesToCopy:IPackageItemsToProcess 
    private manifetsDetails:any 

    constructor(packagesToCopy:IPackageItemsToProcess){
        this.packagesToCopy = packagesToCopy
        this.manifetsDetails = {}
    }

    UpdatePrebuildManifest(packageItem:IPackageItem, prebuildPath:string){
        if (!(packageItem.packageName in this.manifetsDetails)){
            this.manifetsDetails[packageItem.packageName] = {}
        }

        if (!(packageItem.packageVersion in this.manifetsDetails[packageItem.packageName])){
            this.manifetsDetails[packageItem.packageName][packageItem.packageVersion] = {
                prebuildPath
            }
        }
    }

    Copy(distFolder:string){

        const prebuildPath:string = path.join(distFolder, "prebuilds")
        for(const packageItem of Object.values(this.packagesToCopy)){
            const outputPath:string = path.join(prebuildPath, `${packageItem.packageName}@${packageItem.packageVersion}`)

            if (!fsExtra.existsSync(outputPath)){
                fsExtra.mkdirSync(outputPath, {recursive: true})
            }
            fsExtra.copySync(packageItem.prebuildPaths, outputPath)
            this.UpdatePrebuildManifest(packageItem, outputPath)
        }

        fsExtra.writeFileSync(path.join(distFolder, `prebuild-manifest.json`), JSON.stringify(this.manifetsDetails, null, 4) )
        fsExtra.writeFileSync(path.join(distFolder, `prebuild-patcher.js`), JSON.stringify(this.manifetsDetails, null, 4) )
    }

    //patch (), patch-auto {node_modules_folder}
    // opt node_modules

}

