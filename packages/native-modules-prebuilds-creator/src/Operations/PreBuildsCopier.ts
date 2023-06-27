import {  IPackageItem, IPackageItemsToProcess } from "../IPrebuildsCreator"
import fsExtra from "fs-extra"
import path from "path"
import mergedirs from "merge-dirs"
import lodash from "lodash"
import { Consts } from "../Utilities/Consts"
import { Helpers } from "../Utilities/Helpers"
export class PreBuildsCopier{

    static PREBUILD_MANIFEST_FILENAME = "prebuild-manifest.json"
    static PACTCHER_FILENAME = "prebuild-patcher.js"

    private packagesToCopy:IPackageItemsToProcess 
    private manifetsDetails:any 
    private logger:any

    constructor(packagesToCopy:IPackageItemsToProcess){
        this.packagesToCopy = packagesToCopy
        this.manifetsDetails = {}
        this.logger= Helpers.GetLoggger(Consts.LOGGER_NAMES.OPARATORS.COPIER)
    }

    UpdatePrebuildManifest(packageItem:IPackageItem, prebuildPath:string){
        if (!(packageItem.packageName in this.manifetsDetails)){
            this.manifetsDetails[packageItem.packageName] = {}
        }

        if (!(packageItem.packageVersion in this.manifetsDetails[packageItem.packageName])){
            this.manifetsDetails[packageItem.packageName][packageItem.packageVersion] = {
                prebuildPath: prebuildPath.replace("\\","/")
            }
        }
    }

    Copy(distFolder:string="./NMPrebuilds"){
        this.logger.info(`Copying prebuilds folders`)
        distFolder = path.isAbsolute(distFolder) ? distFolder : path.resolve(process.cwd(), distFolder)

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
            mergedirs(packageItem.prebuildPaths, outputPath, 'overwrite')
            this.UpdatePrebuildManifest(packageItem, path.relative(distFolder, outputPath))
        }

        const prebuildManifestPath:string = path.join(distFolder, PreBuildsCopier.PREBUILD_MANIFEST_FILENAME)
        if (fsExtra.existsSync(prebuildManifestPath)){
            this.manifetsDetails = lodash.merge(this.manifetsDetails, JSON.parse(fsExtra.readFileSync(prebuildManifestPath).toString()))
        }

        this.logger.info(`Generating prebuilds manifest files`)
        fsExtra.writeFileSync(prebuildManifestPath, JSON.stringify(this.manifetsDetails, null, 4) )
        fsExtra.writeFileSync(path.join(distFolder, "package.js"), JSON.stringify({
            private: true,
            main: `./${PreBuildsCopier.PACTCHER_FILENAME}`,
            bin: `./${PreBuildsCopier.PACTCHER_FILENAME}`
        }, null, 4))
        fsExtra.copyFileSync(path.join(__dirname, "templates", "prebuild-patcher.js"), path.join(distFolder, PreBuildsCopier.PACTCHER_FILENAME))
        this.logger.info(`Completed creating prebuilds folder: Location './${path.relative(process.cwd(), distFolder)}'`)

        return prebuildPath
    }


}

