import { INativeModuleToPatchDetails, IPactherOptions, IPatchStrategies } from "../IPrebuildsPatcher";
import fsExtra from "fs-extra"
import path from "path"
import mergedirs from "merge-dirs"
import { spawnSync } from "child_process";
import { GetBindingPath } from "../Utilities/Bindings";

abstract class PatcherStrategyBase implements IPatchStrategies{

    protected nativeModule:INativeModuleToPatchDetails
    protected packageJson:any
    protected bindingJson:any
    protected patcherOptions:IPactherOptions
    protected canPatch:boolean

    constructor(nativeModule:INativeModuleToPatchDetails, patcherOptions:IPactherOptions){
        this.nativeModule = nativeModule
        this.packageJson =  JSON.parse(fsExtra.readFileSync(path.join(nativeModule.path, "package.json")).toString())
        this.bindingJson =  JSON.parse(fsExtra.readFileSync(path.join(nativeModule.path, "binding.gyp")).toString())
        this.patcherOptions = patcherOptions
        this.canPatch = this.GetCanPatchValue()
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
        console.log(`Package '${this.nativeModule.name}' seems to use prebuildify. Patching by merging prebuilds folders `)
        const currentPrebuildFolder:string = path.join(this.nativeModule.path, "prebuilds")
        if (!fsExtra.existsSync(currentPrebuildFolder)){
            fsExtra.mkdirSync(currentPrebuildFolder, {recursive:true})
        }

        mergedirs(this.nativeModule.prebuildsPath, currentPrebuildFolder, 'overwrite')
        return true
    }
}


export class BuiltPatcherStratgey extends PatcherStrategyBase{
    private bindingTargetName:string
    private bindingPath:string 

    private SetBinding(){
        this.bindingTargetName = this.bindingJson.targets[0].target_name
        try{
            this.bindingPath = GetBindingPath(this.nativeModule.path, this.bindingTargetName)
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
        console.log(`Pacthing package ${this.nativeModule.name} using strategy 'BuiltPatcherStratgey'`)
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
        console.log(`Pacthing package ${this.nativeModule.name} using strategy 'UnBuiltPatcherStratgey'`)
        debugger
        let nodeGypPath:string 
        try{
            nodeGypPath = require.resolve('node-gyp/bin/node-gyp.js')
        }
        catch(err:any){
            throw new Error(`node-gyp does not seem to be installed. Needed for patch strategy UnbuiltPatcherStratgey`)
        }
        
        spawnSync(nodeGypPath, ["rebuild"], { stdio: 'inherit', cwd: this.nativeModule.path})
        return this.DoPatch()
    }
}