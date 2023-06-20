import { INativeModuleToPatch, INativeModuleToPatchDetails, IPactherOptions, IPatchStrategies } from "../IPrebuildsPatcher"
import { BuiltPatcherStratgey, PrebuildifyPatcherStratgey, UnbuiltPatcherStratgey } from "./PatcherStrategies"
import fsExtra from "fs-extra"
import os from "os"
import path from "path"
import { Consts } from "../Utilities/Consts"

export class Patcher{

    private patchStrategies:any[]
    private backUpPath:string
    private backUpHash:string
    private patcherOptions:IPactherOptions

    constructor(patcherOptions:IPactherOptions={}){
        this.patchStrategies = [PrebuildifyPatcherStratgey, 
                                BuiltPatcherStratgey, 
                                UnbuiltPatcherStratgey]
        
        this.patcherOptions = {
            shouldBackup:true,
            forceRebuildOnNoBindings: true,
            backUpFolderPath: path.join(os.tmpdir(), Consts.BACKUP_DIR_NAME),
            onPatchFail: 'error',
            ...patcherOptions
        }
        this.backUpPath = this.patcherOptions.backUpFolderPath
        this.backUpHash = (+new Date).toString(36)
    }

    Patch(nativeModuleToPatch:INativeModuleToPatch){
        console.log(`Patching the following native modules:-\n\n${Object.values(nativeModuleToPatch).map((n: INativeModuleToPatchDetails)=> {
                        return `${n.name}@${n.version}\n`
                    }).join("")}`)
        if (!this.patcherOptions.shouldBackup === true){
            console.warn("Package backing up set to false. Skipping backing up packages")
        }

        for (const nativeModule of Object.values(nativeModuleToPatch)){
            this.DoBackUp(nativeModule)
            this.StrategyPatch(nativeModule)
        }
    }

    DoBackUp(nativeModule:INativeModuleToPatchDetails){
        if (!this.patcherOptions.shouldBackup === true){
            return
        }
        const buPath:string  = path.join(this.backUpPath, `${path.basename(nativeModule.path)}@${nativeModule.version}`)
        if (fsExtra.existsSync(buPath)){
            console.debug(`Backup already exists. Skipping`)
            return
        }
        console.debug(`Backing up the package ${nativeModule.name} to ${buPath}`)
        
        fsExtra.copySync(nativeModule.path, buPath)
        fsExtra.writeFileSync(path.join(buPath, "buHash.json"), JSON.stringify({...nativeModule, buHash: this.backUpHash}, null, 4))
    }

    private StrategyPatch(nativeModule:INativeModuleToPatchDetails){
        const processPatchError = (err:any) => {
            const msg:string = `Could not patch the packaged '${nativeModule.name}@${nativeModule.version}'. Error:- \n\n${err.message}`
            if (this.patcherOptions.onPatchFail === 'error'){
                throw new Error(msg)
            }
            console.warn(`${msg}. Skipping`)
        }

        let isPatched:boolean = false
        for (const strategy of this.patchStrategies){
            const currentPatchStategy = new strategy(nativeModule, this.patcherOptions) as IPatchStrategies
            try{
                if (currentPatchStategy.CanPatch()){
                    isPatched = currentPatchStategy.Patch()
                    break
                }
            }
            catch(err:any){
                processPatchError(err)
                return
            }
            
        }

        if (isPatched){
            if (this.patcherOptions.shouldBackup === true){
                fsExtra.writeFileSync(path.join(nativeModule.path, "buHash"), this.backUpHash)
            }
        }
        else{
            processPatchError(new Error("Unknown reason."))
        }
    }
}

