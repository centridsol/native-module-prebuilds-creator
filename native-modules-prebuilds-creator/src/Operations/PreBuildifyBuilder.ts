import { IPackageItem, IPackageItemsToProcess, ISupportedTargetObj}  from "../IPrebuildsCreator"
import preBuildify from "prebuildify"
import isNative from 'is-native-module'
import nodeAbi, { Target } from 'node-abi'
import semver from 'semver'
import path from 'path'
import fs from 'fs'

export class Prebuilder{
    private packageToProcess:IPackageItem
    private availableNodeApiTarget:any

    constructor(packageToProcess: IPackageItem){
        this.packageToProcess = packageToProcess
        this.availableNodeApiTarget = nodeAbi.supportedTargets.slice(0)
    }

    Prepare(){
        this.IsNativeModule()
        this.SetSupportedTargetDetails()
        this.ValidateAndSetPackageTargets()
    }

    IsNativeModule(){
        if (!isNative(this.packageToProcess.packageJson)){
            console.warn(`The package ${this.packageToProcess.fullPackageName} does not seem to be a native module. Might not build successfully`)
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
                    console.warn(`${JSON.stringify(compileTarget)}. Skipping as strictTargets is set to false`)
                    return [isSupported, false]
                }
                else if (this.packageToProcess.mergedPrebuildifyOptions.onUnsupportedTargets === 'force'){
                    console.warn(`${JSON.stringify(compileTarget)}. Build might not complete`)
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
                        for (const rTarget of this.availableNodeApiTarget.filter((t:Target) => t.abi === (compileTarget as any).abiVersion )){
                            updatedTargets.push(rTarget)
                        }
                        
                    }
                }
                else if((compileTarget as any)?.runtime && (compileTarget as any)?.target){
                    const abiVersion = nodeAbi.getAbi((compileTarget as any).target, (compileTarget as any).runtime)
                    if (isAbiVersionSupported(compileTarget, abiVersion)[1]){
                        for (const rTarget of this.availableNodeApiTarget.filter((t:Target) => t.abi === abiVersion )){
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

    constructor(packagesToProcess:IPackageItemsToProcess){
        this.packagesToProcess = packagesToProcess
    }

    async BuildAll(){

        for (const [packageName, packageDetails] of Object.entries(this.packagesToProcess)){
            new Prebuilder(packageDetails).Prepare()
            await this.Prebuildifier(packageDetails)
        }
    }

    async Prebuildifier(packageToProcess: IPackageItem){
        console.log(`Build native module: ${packageToProcess.fullPackageName}`)
        return new Promise((resolve:any, reject:any) => {
            try{
                preBuildify({...packageToProcess.mergedPrebuildifyOptions,
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