import { INativeModuleToPatchDetails, IPatchStrategies } from "../IPrebuildsPatcher";
import fsExtra from "fs-extra"
import path from "path"
import mergedirs from "merge-dirs"
import bindings from "bindings"

abstract class PatcherStrategyBase implements IPatchStrategies{

    protected nativeModule:INativeModuleToPatchDetails
    protected packageJson:any
    protected bindingJson:any

    constructor(nativeModule:INativeModuleToPatchDetails){
        this.nativeModule = nativeModule
        this.packageJson =  JSON.parse(fsExtra.readFileSync(path.join(nativeModule.path, "package.json")).toString())
        this.bindingJson =  JSON.parse(fsExtra.readFileSync(path.join(nativeModule.path, "binding.gyp")).toString())
    }

    abstract IsApplicable():boolean
    abstract Patch():boolean
}

export class PrebuildifyPatcherStratgey extends PatcherStrategyBase{
    IsApplicable(){
        return "devDependencies" in this.packageJson 
                && "prebuildify" in this.packageJson.devDependencies
    }

    Patch(){
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
    constructor(nativeModule:INativeModuleToPatchDetails){
        super(nativeModule)
        this.bindingTargetName = this.bindingJson.targets[0].target_name
    }

    IsApplicable(){
        try{
            this.bindingPath = bindings({
                bindings: this.bindingTargetName,
                // @ts-ignore
                module_root: this.nativeModule.path,
                path: true
            })
            if (!(this.bindingPath && fsExtra.existsSync(this.bindingPath))){
                return false
            }
        }
        catch(err:any){
            return false
        }
        return true
        
    }

    Patch(){
        console.log(`Pacthing package ${this.nativeModule.name} using strategy 'BuiltPatcherStratgey'`)
        fsExtra.copy(this.nativeModule.prebuildsArchAndPlatformPath as string, path.dirname(this.bindingPath))

        const bindingPathDir = path.dirname(this.bindingPath)
        fsExtra.unlinkSync(this.bindingPath)
        fsExtra.renameSync(path.join(bindingPathDir, path.basename(this.nativeModule.prebuildsArchAndPlatformAbiPath as string)), 
                           this.bindingPath)
  
        return true
    }
}

export class UnbuiltPatcherStratgey extends PatcherStrategyBase{
    // From https://github.com/TooTallNate/node-bindings/blob/master/bindings.js
    static POTENTIAL_PATHS = [
        // node-gyp's linked version in the "build" dir
        ['module_root', 'build'],
        // node-waf and gyp_addon (a.k.a node-gyp)
        ['module_root', 'build', 'Debug'],
        ['module_root', 'build', 'Release'],
        // Debug files, for development (legacy behavior, remove for node v0.9)
        ['module_root', 'out', 'Debug'],
        ['module_root', 'Debug'],
        // Release files, but manually compiled (legacy behavior, remove for node v0.9)
        ['module_root', 'out', 'Release'],
        ['module_root', 'Release'],
        // Legacy from node-waf, node <= 0.4.x
        ['module_root', 'build', 'default'],
        // Production "Release" buildtype binary (meh...)
        ['module_root', 'compiled', 'version', 'platform', 'arch'],
        // node-qbs builds
        ['module_root', 'addon-build', 'release', 'install-root'],
        ['module_root', 'addon-build', 'debug', 'install-root'],
        ['module_root', 'addon-build', 'default', 'install-root'],
        // node-pre-gyp path ./lib/binding/{node_abi}-{platform}-{arch}
        ['module_root', 'lib', 'binding', 'nodePreGyp']
      ]

    private potentialPaths:string[] = []
    private bindingTargetName:string
    constructor(nativeModule:INativeModuleToPatchDetails){
        super(nativeModule)
        this.potentialPaths =  UnbuiltPatcherStratgey.POTENTIAL_PATHS.map((v:string[])=> {
            v[0] =this.nativeModule.path
            return v.join("/")
        })
        this.bindingTargetName = this.bindingJson.targets[0].target_name
    }

    IsApplicable(){
        return true
    }

    Patch(){
        console.log(`Pacthing package ${this.nativeModule.name} using strategy 'UnBuiltPatcherStratgey'`)
        for (const potentialPath of this.potentialPaths){
            fsExtra.mkdirSync(potentialPath, {recursive: true})
            fsExtra.copy(this.nativeModule.prebuildsArchAndPlatformPath as string, potentialPath)
            fsExtra.renameSync(path.join(potentialPath, path.basename(this.nativeModule.prebuildsArchAndPlatformAbiPath as string)), 
                                this.bindingTargetName)
        }
        return true
    }
}