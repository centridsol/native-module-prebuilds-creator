import { DEFAULT_MODULES } from "@theia/application-manager/lib/rebuild"
import { PrebuildsCreator } from "@centrid/native-modules-prebuilds-creator";
import fs from "fs"
import path from "path"
import os from "os"

export class TheiaPrebuildsCreator{

    static OUTPUT_PATH = path.join(__dirname, "../PrebuildPackages")
    private arch:string
    private platform:string
    private forceAbi:boolean

    constructor(arch:string=null, platform:string=null, forceAbi:null=null, outputPath:string=null, addtionalPackagestoBuild:string[]=[]){
       this.arch = arch || os.arch()
       this.platform = platform  || os.platform()
       this.forceAbi = forceAbi
    }

    private async GetTagerts(){
        if (this.forceAbi){
            return [{
                abiVersion: this.forceAbi
            }]
        }

        let electronLocator:any
        try{
            electronLocator = require("electron-rebuild/lib/src/electron-locator").locateElectronModule
        }
        catch{
            throw new Error(`Failed to obtain electron version being used`)
        }
        
        const electronModulePath  = await electronLocator()
        const packageDetails:any = JSON.parse(fs.readFileSync(require.resolve(`${electronModulePath}/package.json`)).toString())
        return [
            {
                runtime: "electron",
                target: packageDetails.version
            }
        ]
    }

    private GetNativeModules(){
        let nativePackageDetails:string[] = []
        for (const nativeModule of DEFAULT_MODULES){
            try{
                const packageDetails:any = JSON.parse(fs.readFileSync(require.resolve(`${nativeModule}/package.json`)).toString())
                nativePackageDetails.push(`${packageDetails.name}@${packageDetails.version}`)
            }
            catch(err:any){
                throw new Error(`Could not get the package details for the required native module '${nativeModule}'. Error message:- \n\n${err}`)
            }
        }
        return nativePackageDetails
    }

    async Create(){
        await (new PrebuildsCreator({
                                    arch: this.arch,
                                    platform: this.platform,
                                    targets: await this.GetTagerts() as any,
                                    onUnsupportedTargets: 'force'
                                    }, 
                                    this.GetNativeModules(),
                                    TheiaPrebuildsCreator.OUTPUT_PATH)).Create()
    }
    
}


 