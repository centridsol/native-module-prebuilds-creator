import { INativeModuleToPatchDetails, IPactherOptions, IPatchStrategies } from "../IPrebuildsPatcher";
import fsExtra from "fs-extra"
import path from "path"
import mergedirs from "merge-dirs"
import spawn from "cross-spawn";
import { TryGetBindingPath } from "../Utilities/Bindings";
import { SharedHelpers } from "../../../../Shared/Utilities/Helpers";
import { Consts } from "../Utilities/Consts";

abstract class PatcherStrategyBase implements IPatchStrategies{

    protected nativeModule:INativeModuleToPatchDetails
    protected packageJson:any
    protected patcherOptions:IPactherOptions
    protected canPatch:boolean
    protected logger:any

    constructor(nativeModule:INativeModuleToPatchDetails, patcherOptions:IPactherOptions, logger:any=SharedHelpers.GetLoggger(Consts.LOGGER_NAMES.PACTHER)){
        this.nativeModule = nativeModule
        this.packageJson =  JSON.parse(fsExtra.readFileSync(path.join(nativeModule.path, "package.json")).toString())
        this.patcherOptions = patcherOptions
        this.canPatch = this.GetCanPatchValue()
        this.logger = logger
    }

    protected abstract GetCanPatchValue():boolean
    abstract Patch():boolean

    protected CheckCanRun(){
        if(!this.canPatch){
            // @ts-ignore
            throw new Error(`The patch strategy '${this.constructor.name}' cannot be run`)
        }
        
    }
    CanPatch(){
        return this.canPatch
    }

}

export class PrebuildifyPatcherStratgey extends PatcherStrategyBase{
    protected GetCanPatchValue(){
        return "devDependencies" in this.packageJson 
                && "prebuildify" in this.packageJson.devDependencies
    }

    Patch(){
        this.CheckCanRun()
        this.logger.info(`Pacthing package '${this.nativeModule.name}' using strategy 'PrebuildifyPatcherStratgey'.`)
        const currentPrebuildFolder:string = path.join(this.nativeModule.path, "prebuilds")
        if (!fsExtra.existsSync(currentPrebuildFolder)){
            fsExtra.mkdirSync(currentPrebuildFolder, {recursive:true})
        }

        mergedirs(this.nativeModule.prebuildsPath, currentPrebuildFolder, 'overwrite')
        return true
    }
}


export class BuiltPatcherStratgey extends PatcherStrategyBase{
    private bindingPath:string 

    private SetBinding(){
        try{
            this.bindingPath = TryGetBindingPath(this.nativeModule.path)
            if (!(this.bindingPath && fsExtra.existsSync(this.bindingPath))){
                return null
            }
        }
        catch(err:any){
            return null
        }
       
        return this.bindingPath
    }

    protected GetCanPatchValue(){
        return this.SetBinding() != null
    }

    Patch(){
        this.CheckCanRun()
        this.logger.info(`Pacthing package '${this.nativeModule.name}' using strategy 'BuiltPatcherStratgey'`)
        return this.DoPatch()
    }

    protected DoPatch(){
        if (!(this.bindingPath ? this.bindingPath : this.SetBinding())){
            throw new Error(`Could not find the binding path for '${this.nativeModule.name}'`)
        }

        const bindingPathDir = path.dirname(this.bindingPath)
        mergedirs(this.nativeModule.prebuildsArchAndPlatformPath as string, bindingPathDir,  'overwrite')

        fsExtra.renameSync(path.join(bindingPathDir, path.basename(this.nativeModule.prebuildsArchAndPlatformAbiPath as string)), 
                           this.bindingPath)
  
        return true
    }
}

export class UnbuiltPatcherStratgey extends BuiltPatcherStratgey{
    protected GetCanPatchValue(){
        return this.patcherOptions.forceRebuildOnNoBindings ===  true
    }

    Patch(){
        this.CheckCanRun()
        this.logger.info(`Pacthing package '${this.nativeModule.name}' using strategy 'UnBuiltPatcherStratgey'`)
        let nodeGypPath:string 
        try{
            nodeGypPath = eval("require.resolve('node-gyp/bin/node-gyp.js')")
        }
        catch(err:any){
            throw new Error(`node-gyp does not seem to be installed. Needed for patch strategy UnbuiltPatcherStratgey`)
        }
        
        spawn.sync(nodeGypPath, ["rebuild"], { stdio: 'inherit', cwd: this.nativeModule.path})
        return this.DoPatch()
    }
}