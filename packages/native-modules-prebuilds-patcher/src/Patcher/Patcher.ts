import { INativeModuleToPatch, INativeModuleToPatchDetails, IPactherOptions, IPatchStrategies } from "../IPrebuildsPatcher"
import { BuiltPatcherStratgey, PrebuildifyPatcherStratgey, UnbuiltPatcherStratgey } from "./PatcherStrategies"
import fsExtra from "fs-extra"
import os from "os"
import path from "path"
import { Consts } from "../Utilities/Consts"
import { Helpers } from "../Utilities/Helpers"

export class Patcher{

    private patchStrategies:any[]
    private backUpPath:string
    private backUpHash:string
    private patcherOptions:IPactherOptions
    private logger:any

    constructor(patcherOptions:IPactherOptions={}){
        this.patchStrategies = [PrebuildifyPatcherStratgey, 
                                BuiltPatcherStratgey, 
                                UnbuiltPatcherStratgey]
        
        this.patcherOptions = {
            shouldBackup:true,
            forceRebuildOnNoBindings: true,
            onPatchFail: 'error',
            ...patcherOptions
        }
        this.backUpPath = path.join(os.tmpdir(), Consts.BACKUP_DIR_NAME)
        this.backUpHash = (+new Date).toString(36)
        this.logger = Helpers.GetLoggger(Consts.LOGGER_NAMES.PACTHER)
    }

    Patch(nativeModuleToPatch:INativeModuleToPatch){
        this.logger.info(`Patching the following native modules:-\n\n${Object.values(nativeModuleToPatch).map((n: INativeModuleToPatchDetails)=> {
                        return `${n.name}@${n.version}\n`
                    }).join("")}`)
        if (!this.patcherOptions.shouldBackup === true){
            this.logger.warn("Package backing up set to false. Skipping backing up packages")
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
            this.logger.verbose(`Backup already exists. Skipping`)
            return
        }
        this.logger.verbose(`Backing up the package ${nativeModule.name} to ${buPath}`)
        
        fsExtra.copySync(nativeModule.path, buPath)
        fsExtra.writeFileSync(path.join(buPath, Consts.BACKUP_JSON_NAME), this.GetBuHashDetails(nativeModule))
    }

    private GetBuHashDetails(nativeModule:INativeModuleToPatchDetails){
        return JSON.stringify({...nativeModule, buHash: this.backUpHash}, null, 4)
    }

    private StrategyPatch(nativeModule:INativeModuleToPatchDetails){
        const processPatchError = (err:any) => {
            const msg:string = `Could not patch the packaged '${nativeModule.name}@${nativeModule.version}'. Error:- \n\n${err.message}`
            if (this.patcherOptions.onPatchFail === 'error'){
                throw new Error(msg)
            }
            this.logger.warn(`${msg}. Skipping`)
        }

        let isPatched:boolean = false
        for (const strategy of this.patchStrategies){
            const currentPatchStategy = new strategy(nativeModule, this.patcherOptions, this.logger) as IPatchStrategies
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
                fsExtra.writeFileSync(path.join(nativeModule.path, Consts.BACKUP_JSON_NAME), this.GetBuHashDetails(nativeModule))
            }
        }
        else{
            processPatchError(new Error("This usually means building the package also failed. If --forceRebuildOnNoBindings is set to false, that could be the problem."))
        }
    }
}

