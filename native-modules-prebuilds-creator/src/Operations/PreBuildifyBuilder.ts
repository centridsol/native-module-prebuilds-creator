import { IPackageItem, IPackageItemsToProcess, IPackagePath, IPreBuildifyOptions, ISupportedTargetObj}  from "../IPrebuildsCreator"
import preBuildify from "prebuildify"
import path from 'path'
import isNative from 'is-native-module'
import nodeAbi, { Target } from 'node-abi'
import semver from 'semver'

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
            // TODO
            console.error("The package ${packageName} does not seem to be a native module")
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

        console.log(this.packageToProcess.packageJson)
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
                    return target.runtime === "node" &&  semver.satisfies(target.target, new semver.Range(targetsObj.runtimeRestrictions.node))
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
                    return target.runtime === "electron" &&  semver.satisfies(target.target, new semver.Range(targetsObj.runtimeRestrictions.electron))
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
            targetsObj.supportedAbiVersions = this.availableNodeApiTarget.map((target:any) => target.abi)
            targetsObj.supportedTargets.electron = this.availableNodeApiTarget.filter((target:Target) => target.runtime === "electron" )
            targetsObj.supportedTargets.node = this.availableNodeApiTarget.filter((target:Target) => target.runtime === "node" )
        }

        this.packageToProcess.SetSupportedTargetObj(targetsObj)

    }
        
    ValidateAndSetPackageTargets(){
        const isAbiVersionSupported = (compileTarget:any, abiVersion:string) => {
            const isSupported = this.packageToProcess.supportedTargetObj.supportedAbiVersions.includes(abiVersion)
            const baseError:string = `The target ${JSON.stringify(compileTarget)} is not support for the package ${this.packageToProcess.fullPackageName}. Support packages are :-\n\n ${
                JSON.stringify(this.packageToProcess.supportedTargetObj.supportedTargets)
            }`
            if (!isSupported){
                if (this.packageToProcess.mergedPrebuildifyOptions.strictTargets !== false){
                    throw new Error(baseError)
                }
                else{
                    console.warn(`${compileTarget}. Skipping as strictTargets is set to false`)
                }
            }
            
            return isSupported
        }

        let updatedTargets:any = []
        if (this.packageToProcess.mergedPrebuildifyOptions.targets.length === 0){
            updatedTargets = [...this.packageToProcess.supportedTargetObj.supportedTargets.electron,
                              ...this.packageToProcess.supportedTargetObj.supportedTargets.node]
        }
        else{
            for (const compileTarget of this.packageToProcess.mergedPrebuildifyOptions.targets){
            
                if ((compileTarget as any)?.abiVersion ){
                    if (isAbiVersionSupported(compileTarget, (compileTarget as any).abiVersion)){
                        for (const rTarget of this.availableNodeApiTarget.filter((t:Target) => t.abi === (compileTarget as any).abiVersion )){
                            updatedTargets.push(rTarget)
                        }
                        
                    }
                }
                else if((compileTarget as any)?.runtime && (compileTarget as any)?.target){
                    if (isAbiVersionSupported(compileTarget, nodeAbi.getAbi((compileTarget as any).target, (compileTarget as any).runtime))){
                        updatedTargets.push(compileTarget)
                    }
                }
            }

            this.packageToProcess.mergedPrebuildifyOptions.targets = updatedTargets
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
                // TODO: Work on resolve
                preBuildify({...packageToProcess.mergedPrebuildifyOptions, cwd: packageToProcess.sourcePath}, resolve)
            }
            catch(err:any){
                reject(err)
            }
            
        })
    }
}