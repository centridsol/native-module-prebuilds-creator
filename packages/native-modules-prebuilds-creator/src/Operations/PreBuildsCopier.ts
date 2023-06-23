import {  IPackageItem, IPackageItemsToProcess } from "../IPrebuildsCreator"
import fsExtra from "fs-extra"
import path from "path"

export class PreBuildsCopier{

    static PREBUILD_MANIFEST_FILENAME = "prebuild-manifest.json"
    static PACTCHER_FILENAME = "prebuild-patcher.js"

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
                // TODO: Normalise path for windows
                prebuildPath
            }
        }
    }

    Copy(distFolder:string){

        const prebuildPath:string = path.join(distFolder, "prebuilds")
        for(const packageItem of Object.values(this.packagesToCopy)){
            // Assume skipped. We check the path after build packages, and error out if not present. 
            // The only way it can reach this point and be null is it was skipped
            // TODO: maybe improve. Have a process indicator, that actually shows it was skipped
            if (!packageItem.prebuildPaths){
                continue
            }
            const outputPath:string = path.join(prebuildPath, `${packageItem.packageName}@${packageItem.packageVersion}`)

            if (!fsExtra.existsSync(outputPath)){
                fsExtra.mkdirSync(outputPath, {recursive: true})
            }
            fsExtra.copySync(packageItem.prebuildPaths, outputPath)
            this.UpdatePrebuildManifest(packageItem, path.relative(distFolder, outputPath))
        }

        fsExtra.writeFileSync(path.join(distFolder, PreBuildsCopier.PREBUILD_MANIFEST_FILENAME), JSON.stringify(this.manifetsDetails, null, 4) )
        fsExtra.writeFileSync(path.join(distFolder, "package.js"), JSON.stringify({
            private: true,
            main: `./${PreBuildsCopier.PACTCHER_FILENAME}`
        }, null, 4))
        fsExtra.copyFileSync(path.join(__dirname, "templates", "prebuild-patcher.js"), path.join(distFolder, PreBuildsCopier.PACTCHER_FILENAME))
        
    }


}

