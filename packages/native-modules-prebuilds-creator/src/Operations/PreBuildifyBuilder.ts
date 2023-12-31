import { IPackageItem, IPackageItemsToProcess, ISupportedTargetObj}  from "../IPrebuildsCreator"
import { PrebuildifyWrapper } from "../Utilities/PrebuildifyWrapper/PrebuildifyWrapper"
import nodeAbi, { Target } from 'node-abi'
import semver from 'semver'
import path from 'path'
import fs from 'fs'
import { Consts } from "../Utilities/Consts"
import { Helpers } from "../Utilities/Helpers"
import lodash from "lodash"
import os from "os"
export class Prebuilder{
    private packageToProcess:IPackageItem
    private availableNodeApiTarget:any
    private logger:any

    constructor(packageToProcess: IPackageItem){
        this.packageToProcess = packageToProcess
        this.availableNodeApiTarget = nodeAbi.supportedTargets.slice(0)
        this.logger = Helpers.GetLoggger(Consts.LOGGER_NAMES.OPARATORS.BUILDER)
    }

    Prepare(){
        this.IsNativeModule()
        this.ValidateArchAndPlatform()
        this.SetSupportedTargetDetails()
        this.ValidateAndSetPackageTargets()
    }

    private ValidateArchAndPlatform(){
        if (os.platform() !== this.packageToProcess.mergedPrebuildifyOptions.platform){
            throw new Error(`Can't cross build. Current platfom:- ${os.platform()}. Target platform:- ${this.packageToProcess.mergedPrebuildifyOptions.platform}`)
        }

        if (!(['arm', 'arm64', 'ia32', 'mips', 'mipsel', 'ppc', 'ppc64', 's390', 's390x', 'x64'].includes(this.packageToProcess.mergedPrebuildifyOptions.arch))){
            throw new Error(`Unknown architecture '${this.packageToProcess.mergedPrebuildifyOptions.arch}'`)
        }
    }

    IsNativeModule(){
        if (!fs.existsSync(path.join(this.packageToProcess.sourcePath, "binding.gyp"))){
            this.logger.warn(`The package ${this.packageToProcess.fullPackageName} does not seem to be a native module. Might not build successfully`)
            return false
        }
        return true
    }

    SetSupportedTargetDetails(){

        let targetsObj:ISupportedTargetObj = {
            runtimeRestrictions: {
                node: null,
                electron: null
            },
            supportedTargets: {
                node: null,
                electron: null
            },
            supportedAbiVersions: null
        }

        if (this.packageToProcess.packageJson?.engines){
            if (this.packageToProcess.packageJson.engines?.node){
                targetsObj.runtimeRestrictions.node = this.packageToProcess.packageJson.engines.node
            }

            if (this.packageToProcess.packageJson.engines?.electron){
                targetsObj.runtimeRestrictions.electron = this.packageToProcess.packageJson.engines.electron
            }
        }

        if (targetsObj.runtimeRestrictions.node || targetsObj.runtimeRestrictions.electron){
            targetsObj.supportedAbiVersions = []

            if (targetsObj.runtimeRestrictions.node){
                targetsObj.supportedTargets.node = this.availableNodeApiTarget.filter((target:Target) => {
                    return target.runtime === "node" &&  
                    semver.satisfies(target.target, new semver.Range(targetsObj.runtimeRestrictions.node), { includePrerelease: this.packageToProcess.mergedPrebuildifyOptions.includePreReleaseTargets || false})
                } )

                targetsObj.supportedAbiVersions = (targetsObj.supportedTargets.node || []).map((target:any) => target.abi)

                if (!targetsObj.runtimeRestrictions.electron){
                    targetsObj.supportedTargets.electron = this.availableNodeApiTarget.filter((target:Target) => {
                        return target.runtime === "electron" &&   targetsObj.supportedAbiVersions.includes(target.abi)
                    } )
                }
            }

            if (targetsObj.runtimeRestrictions.electron){
                targetsObj.supportedTargets.electron = this.availableNodeApiTarget.filter((target:Target) => {
                    return target.runtime === "electron" &&  
                    semver.satisfies(target.target, new semver.Range(targetsObj.runtimeRestrictions.electron), { includePrerelease: this.packageToProcess.mergedPrebuildifyOptions.includePreReleaseTargets || false})
                } )


                targetsObj.supportedAbiVersions = [...new Set([...targetsObj.supportedAbiVersions,
                                                               ...(targetsObj.supportedTargets.electron || []).map((target:Target) => target.abi)])]

                if (!targetsObj.runtimeRestrictions.node){
                    targetsObj.supportedTargets.node = this.availableNodeApiTarget.filter((target:Target) => {
                        return target.runtime === "node" &&   targetsObj.supportedAbiVersions.includes(target.abi)
                    } )
                }
            } 

        }
        else{
            targetsObj.supportedAbiVersions = [...new Set(this.availableNodeApiTarget.map((target:any) => target.abi))] as string[]
            targetsObj.supportedTargets.electron = this.availableNodeApiTarget.filter((target:Target) => target.runtime === "electron" )
            targetsObj.supportedTargets.node = this.availableNodeApiTarget.filter((target:Target) => target.runtime === "node" )
        }

        targetsObj.supportedAbiVersions.sort((a:string, b:string) => parseInt(a) - parseInt(b))
        this.packageToProcess.SetSupportedTargetObj(targetsObj)

    }
        
    ValidateAndSetPackageTargets(){
        const isAbiVersionSupported = (compileTarget:any, abiVersion:string) => {
            const isSupported = this.packageToProcess.supportedTargetObj.supportedAbiVersions.includes(abiVersion)
            const baseError:string = `The target ${JSON.stringify(compileTarget)} is not support for the package ${this.packageToProcess.fullPackageName}. Support packages are :-\n\n ${
                JSON.stringify(this.packageToProcess.supportedTargetObj.supportedTargets)
            }`
            if (!isSupported){
                if (this.packageToProcess.mergedPrebuildifyOptions.onUnsupportedTargets === 'error' ||
                    !this.packageToProcess.mergedPrebuildifyOptions.onUnsupportedTargets ){
                    throw new Error(baseError)
                }
                else if (this.packageToProcess.mergedPrebuildifyOptions.onUnsupportedTargets === 'skip'){
                    this.logger.warn(`Support for ${JSON.stringify(compileTarget)} is unknown. Skipping as onUnsupportedTargets is set to 'skip'`)
                    return [isSupported, false]
                }
                else if (this.packageToProcess.mergedPrebuildifyOptions.onUnsupportedTargets === 'force'){
                    this.logger.warn(`Support for ${JSON.stringify(compileTarget)} is unknown. Build might not complete`)
                    return [isSupported, true]
                }
            }
            
            return [isSupported, true]
        }

        let updatedTargets:any = []
        if (this.packageToProcess.mergedPrebuildifyOptions.targets.length === 0){
            updatedTargets = [...this.packageToProcess.supportedTargetObj.supportedTargets.electron,
                              ...this.packageToProcess.supportedTargetObj.supportedTargets.node]      
        }
        else{
            for (const compileTarget of this.packageToProcess.mergedPrebuildifyOptions.targets){
                
                if ((compileTarget as any)?.abiVersion ){
                    if (isAbiVersionSupported(compileTarget, (compileTarget as any).abiVersion)[1]){
                        for (const rTarget of this.availableNodeApiTarget.filter((t:Target) => 
                            t.abi === (compileTarget as any).abiVersion && 
                            ((compileTarget as any)?.runtime ?  (t.runtime == (compileTarget as any).runtime) : true)
                         )){
                            updatedTargets.push(rTarget)
                        }
                        
                    }
                }
                else if((compileTarget as any)?.runtime && (compileTarget as any)?.target){
                    const abiVersion = nodeAbi.getAbi((compileTarget as any).target, (compileTarget as any).runtime)
                    if (isAbiVersionSupported(compileTarget, abiVersion)[1]){
                        for (const rTarget of this.availableNodeApiTarget.filter((t:Target) => 
                            t.abi === abiVersion &&
                            t.runtime == (compileTarget as any).runtime
                        )){
                            updatedTargets.push(rTarget)
                        }
                    }
                }
            }

            this.packageToProcess.mergedPrebuildifyOptions.targets = [...new Set(updatedTargets)] as any
        }
        
    }

}
export class PreBuildifyBuilder{

    private packagesToProcess:IPackageItemsToProcess 
    private logger:any

    constructor(packagesToProcess:IPackageItemsToProcess){
        this.packagesToProcess = packagesToProcess
        this.logger = Helpers.GetLoggger(Consts.LOGGER_NAMES.OPARATORS.BUILDER)
    }

    async BuildAll(){

        for (const packageDetails of Object.values(this.packagesToProcess)){
            new Prebuilder(packageDetails).Prepare()
            await this.Prebuildifier(packageDetails)
        }
    }

    async Prebuildifier(packageToProcess: IPackageItem){
        if (packageToProcess.mergedPrebuildifyOptions.targets.length == 0){
            this.logger.info(`No targets to build for the native module '${packageToProcess.fullPackageName}'. Skipping`)
            return Promise.resolve()
        }

        const preBuildDetails:any = lodash.omit(packageToProcess.mergedPrebuildifyOptions, ["onUnsupportedTargets", "includePreReleaseTargets"])
        this.logger.info(`Build native module: ${packageToProcess.fullPackageName}. Build options:-\n\n${JSON.stringify(preBuildDetails, null, 4)}`)
        
        return new Promise((resolve:any, reject:any) => {
            try{
                PrebuildifyWrapper({...packageToProcess.mergedPrebuildifyOptions,
                                    out: packageToProcess.sourcePath,
                                    cwd: packageToProcess.sourcePath}, (err:any) => {
                                        if (err){
                                            reject(err)
                                        }
                                        else{
                                            const prebuildsPath = path.join(packageToProcess.sourcePath, "prebuilds")
                                            if (!fs.existsSync(prebuildsPath)){
                                                reject("Even though the build completed successfully, cannot seem to find 'prebuild' folder")
                                            }
                                            else{
                                                packageToProcess.SetPrebuildPath(prebuildsPath)
                                                resolve()
                                            }

                                    }
                })
            }
            catch(err:any){
                reject(err)
            }
        })
    }
}