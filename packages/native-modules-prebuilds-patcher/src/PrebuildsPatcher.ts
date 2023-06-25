
import fsExtra from "fs-extra";
import nodeAbi from 'node-abi'
import path from "path";
import semver from "semver";
import { INativeModuleToPatch, IPactherOptions } from "./IPrebuildsPatcher";
import { Patcher } from "./Patcher/Patcher";
import { Consts } from "./Utilities/Consts";
import { rimrafSync } from "rimraf";
import os from "os"
import lodash from "lodash";
import { SharedHelpers } from "../../../Shared/Utilities/Helpers";


export class PrebuildsPatcher{
    private prebuildsManifest:any
    private prebuildsFolder:string
    private projectDir:string
    private patcherOptions:IPactherOptions
    private logger:any

    constructor(prebuildsPath:string, patcherOptions:IPactherOptions={}){
        this.prebuildsManifest = JSON.parse(fsExtra.readFileSync(prebuildsPath).toString())
        this.prebuildsFolder = path.dirname(prebuildsPath)
        this.patcherOptions = {onNoPrebuildsFound: 'skip', ...patcherOptions}
        this.projectDir = patcherOptions.projectPath || this.TryGetProjectPath()
        this.logger = SharedHelpers.GetLoggger(Consts.LOGGER_NAMES.MAIN)
    }

    private TryGetProjectPath(){

        const _getProjectPath:any = (dir:string, prev:string = null) => {
            if (prev && prev === dir){
                throw new Error(`Could not determine the project path. Either set it in the options or run the from a project folder`)
            }
            if ( fsExtra.existsSync(path.join(dir, "package.json")) ||
                 fsExtra.existsSync(path.join(dir, "node_modules")) ){
                return dir    
            }
            return _getProjectPath(path.join(dir, ".."), dir)
        }

        return _getProjectPath(process.cwd())
    }

    SetProjectPath(projectDir:string){
        if (!fsExtra.existsSync(projectDir)){
            throw new Error(`The project path '${projectDir}' does not exist`)
        }
        this.projectDir = projectDir
    }

    RevertPatchs(){
        const backUpDir = path.join(os.tmpdir(), Consts.BACKUP_DIR_NAME)
        if (!fsExtra.existsSync(backUpDir)){
            return
        }
        
        for (const modulePath of fsExtra.readdirSync(backUpDir)) {
            const revertDetailsPath = path.join(backUpDir, modulePath, Consts.BACKUP_JSON_NAME);
            if(!fsExtra.existsSync(revertDetailsPath)){
                this.logger.verbose(`Cannot revert '${revertDetailsPath}'. Doesnt seem like it was generated by native-modules-prebuilds-patcher `)
                continue
            }
            const revertDetails= JSON.parse(fsExtra.readFileSync(revertDetailsPath).toString())

            if(!fsExtra.existsSync(revertDetails.path) || !revertDetails.path.includes(this.projectDir)){
                this.logger.verbose(`Cannot revert '${revertDetailsPath}'. Not part of the project found at '${this.projectDir}'`)
                continue
            }

            const currentJsonDetails:any = JSON.parse(fsExtra.readFileSync(path.join(revertDetails.path, "package.json")).toString())

            if (currentJsonDetails.version != revertDetails.version){
                this.logger.warn(`Cannot revert '${revertDetailsPath}'. A different verison has been installed`)
                continue
            }

            rimrafSync(revertDetails.path)
            fsExtra.copySync(path.resolve(backUpDir, modulePath), revertDetails.path)
            fsExtra.unlinkSync(path.join(revertDetails.path, Consts.BACKUP_JSON_NAME))

        }
    }

    private ValaidateAndGetNativeModulesToPatch(nativeModuleToPatch:INativeModuleToPatch, arch:any, platform:any, runtime:any){
        const processOnNoPrebuildsFound =(errMessage:string) => {
            if (this.patcherOptions.onNoPrebuildsFound == 'error'){
                throw new Error(errMessage)
            }
            if (this.patcherOptions.onNoPrebuildsFound == 'skip'){
                this.logger.warn(`${errMessage}. Skipping`)
                return false
            }
            return false
        }
        return Object.fromEntries(Object.entries(nativeModuleToPatch).filter(([packagaeName, packageDetails]) => {
            if (!(packagaeName in this.prebuildsManifest)){
                return processOnNoPrebuildsFound(`No prebuilds found for the package ${packagaeName}`)
            }

            const prebuildVersion:string = Object.keys(this.prebuildsManifest[packagaeName]).find((prebuildVersion:string) => {
                // TODO: Conside if reqursed on range. As it is it has to be extar
                return semver.satisfies(prebuildVersion, packageDetails.version)
            })

            if (!prebuildVersion){
                return processOnNoPrebuildsFound(`No prebuilds with the version ${packageDetails.version} found for the package ${packagaeName}`)
            }

            const prebuildsDetails = this.prebuildsManifest[packagaeName][prebuildVersion]

            const arcPlatformPath:string = path.join(this.prebuildsFolder, prebuildsDetails.prebuildPath, `${platform}-${arch}`)

            if (!fsExtra.existsSync(arcPlatformPath)){
                return processOnNoPrebuildsFound(`No prebuilds for the platform ${platform} and arch ${arch} found for the package ${packagaeName}.`)
            }

            if (!runtime.includes("@")){
                throw new Error(`The runtime value must have the format [runtime]@[version]`)
            }

            const pDetails = runtime.split("@")
            const runtimeDetails:any =  {
                runtime: pDetails[0],
                target: pDetails[1]
            }

            const targetAbi:string = nodeAbi.getAbi(runtimeDetails.target, runtimeDetails.runtime)
            const nodeApiFileName = fsExtra.readdirSync(arcPlatformPath).find((fp:string) => {
                return fp == `${runtimeDetails.runtime}.abi${targetAbi}.node`
            })

            if (!nodeApiFileName){
                return processOnNoPrebuildsFound(`Could not find any prebuilds for the runtime '${runtime}' for the package ${packagaeName}..`)
            }

            packageDetails.prebuildsPath = path.join(this.prebuildsFolder, prebuildsDetails.prebuildPath)
            packageDetails.prebuildsArchAndPlatformPath = arcPlatformPath
            packageDetails.prebuildsArchAndPlatformAbiPath = path.join(arcPlatformPath, nodeApiFileName)

            const potentialBuHashFile = path.join(packageDetails.path, Consts.BACKUP_JSON_NAME)
            if (fsExtra.existsSync(potentialBuHashFile)){
                const buHashDetails:any = JSON.parse(fsExtra.readFileSync(potentialBuHashFile).toString())
                if (lodash.isEqual(lodash.omit(buHashDetails, ["buHash"]), packageDetails)){
                    this.logger.info(`The package '${packagaeName}' seems like it has already been patched for the runtime '${runtime}' (platform:- ${platform}, arch:- ${arch}). Skipping. If you think this is a mistake try delete and reinstalling the node module.`)
                    return false
                }
            }
             
            return true
        }))
    }

    private DoPatch(packages:any): Promise<any>{
        try{
            new Patcher(this.patcherOptions).Patch(packages)
            return Promise.resolve()
        }
        catch(err:any){
            this.RevertPatchs()
            return Promise.reject(err)
        }
        
    }

    async Patch(packagesToPatch:string[], arch:any, platform:any, runtime:any){

        const availableNativeModules:INativeModuleToPatch = await this.GetProjectNativeModules(this.projectDir)

        const nativeModulesToPatch:any = packagesToPatch.map((p:string) => {
            if(p.includes("@")){
                const pDetails = p.split("@")
                return {
                    name: pDetails[0],
                    version: pDetails[1]
                }
            }
            throw new Error(`Package to patch should have the format [package]@[version]`)
        }).reduce((pv:INativeModuleToPatch, pD:any) => {
            if (!(pD.name in availableNativeModules)){
                throw new Error(`The package '${pD.name}' in not installed for your project.`)

            }

            if (!semver.satisfies(availableNativeModules[pD.name].version, pD.version)){
                throw new Error(`The installed version of the package '${pD.name}' has different version. Installed version '${availableNativeModules[pD.name].version}'. Required version '${pD.version}'`)
            }

            pv[pD.name] = availableNativeModules[pD.name]
            return pv
        }, {})

        return this.DoPatch(this.ValaidateAndGetNativeModulesToPatch(nativeModulesToPatch, arch, platform, runtime))
        
    }

    async PatchAll(arch:any, platform:any, runtime:any){        
        const prebuildsAvailable = this.ValaidateAndGetNativeModulesToPatch(this.GetProjectNativeModules(), arch, platform, runtime)
        return this.DoPatch(prebuildsAvailable)
    }

    private GetProjectNativeModules(projectPath:string=this.projectDir, filter:(moduleName: string, realPath:string) => boolean = null): INativeModuleToPatch{
        const nodeModulesPath = path.join(projectPath, "node_modules")

        let nodeModulesPaths = new Set([])
        let modulePaths = new Set([])
        let nativeModules:INativeModuleToPatch = {}

        const _getNativeModules = (_nodeModulesPath:string) => {
            const realNodeModulesPath =  fsExtra.realpathSync(_nodeModulesPath);
            if (nodeModulesPaths.has(realNodeModulesPath)) {
                return;
            }
            nodeModulesPaths.add(realNodeModulesPath);
            for (const modulePath of  fsExtra.readdirSync(realNodeModulesPath)) {
                if (modulePath === '.bin')
                    continue;
        
                const realPath =  fsExtra.realpathSync(path.resolve(_nodeModulesPath, modulePath));
                if (modulePaths.has(realPath)) {
                    continue;
                }
                modulePaths.add(realPath);
        
                if ( fsExtra.pathExistsSync(path.resolve(realPath, 'binding.gyp'))) {
                    if (filter && !filter(modulePath, realPath)){
                        continue
                    }

                    const packageJson= JSON.parse((fsExtra.readFileSync(path.join(realPath, "package.json"))).toString())
                    nativeModules[packageJson.name]  = {
                        name:packageJson.name,
                        version:packageJson.version,
                        path:realPath
                    }
                }
        
                if (modulePath.startsWith('@')) {
                     _getNativeModules(realPath);
                }
                if ( fsExtra.pathExistsSync(path.resolve(realPath, 'node_modules'))) {
                     _getNativeModules(path.resolve(realPath, 'node_modules'));
                }
            }
        }

        _getNativeModules(nodeModulesPath)
        return nativeModules
        
    }
}
