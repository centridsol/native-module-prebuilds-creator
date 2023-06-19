import { INativeModuleToPatch, INativeModuleToPatchDetails, IPatchStrategies } from "../IPrebuildsPatcher"
import { BuiltPatcherStratgey, PrebuildifyPatcherStratgey, UnbuiltPatcherStratgey } from "./PatcherStrategies"
import fsExtra from "fs-extra"
import os from "os"
import path from "path"

export class Patcher{
    
    private patchStrategies:any[]
    private backUpPath:string
    private backUpHash:string

    constructor(){
        this.patchStrategies = [PrebuildifyPatcherStratgey, 
                                BuiltPatcherStratgey, 
                                UnbuiltPatcherStratgey]
        
        this.backUpPath = path.join(os.homedir(), ".native-modules-patcher-bu")
        this.backUpHash = (+new Date).toString(36)
    }

    Patch(nativeModuleToPatch:INativeModuleToPatch){
        console.log(`Patching the following native modules:- \n\n
                    ${Object.values(nativeModuleToPatch).map((n: INativeModuleToPatchDetails)=> {
                        return `${n.name}@${n.version}\n`
                    }).join("")}`)

        for (const nativeModule of Object.values(nativeModuleToPatch)){
            this.DoBackUp(nativeModule)
            this.StrategyPatch(nativeModule)
        }
    }

    DoBackUp(nativeModule:INativeModuleToPatchDetails){
        const buPath:string  = path.join(this.backUpPath, path.basename(nativeModule.path))
        console.debug(`Backing up the package ${nativeModule.name} to ${buPath}`)
        fsExtra.copySync(nativeModule.path, buPath)
        fsExtra.writeFileSync(path.join(buPath, "buHash.json"), JSON.stringify({...nativeModule, buHash: this.backUpHash}, null, 4))
    }

    private StrategyPatch(nativeModule:INativeModuleToPatchDetails){
        for (const strategy of this.patchStrategies){
            const currentPatchStategy = new strategy(nativeModule) as IPatchStrategies
            if (strategy.IsApplicable(nativeModule)){
                strategy.Patch(nativeModule)
                fsExtra.writeFileSync(path.join(nativeModule.path, "buHash"), this.backUpHash)
                break
            }
        }
    }
}

