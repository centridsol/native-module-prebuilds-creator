
import fsExtra, { readFileSync } from "fs-extra";
import nodeAbi from 'node-abi'
import path from "path";
import semver from "semver";
import { INativeModuleToPatch, IPactherOptions } from "./IPrebuildsPatcher";
import { Patcher } from "./Patcher/Patcher";


export class PrebuildsPatcher{
    private prebuildsManifest:any
    private prebuildsFolder:string
    private projectDir:string
    private patcherOptions:IPactherOptions

    constructor(prebuildsPath:string, patcherOptions:IPactherOptions={}){
        this.prebuildsManifest = JSON.parse(fsExtra.readFileSync(prebuildsPath).toString())
        this.prebuildsFolder = path.dirname(prebuildsPath)
        this.patcherOptions = {onNoPrebuildsFound: 'skip', ...patcherOptions}
        this.projectDir = patcherOptions.projectPath || this.TryGetProjectPath()
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

    async RevertPatch(){

    }

    private ValaidateAndGetNativeModulesToPatch(nativeModuleToPatch:INativeModuleToPatch, arch:any, platform:any, runtime:any){
        const processOnNoPrebuildsFound =(errMessage:string) => {
            if (this.patcherOptions.onNoPrebuildsFound == 'error'){
                throw new Error(errMessage)
            }
            if (this.patcherOptions.onNoPrebuildsFound == 'skip'){
                console.warn(`${errMessage}. Skipping`)
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
                return processOnNoPrebuildsFound(`No prebuilds for the platform ${platform} and arch ${arch}found for the package ${packagaeName}.`)
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
                return processOnNoPrebuildsFound(`Could not find any prebuilds for the runtime '${runtime}'.`)
            }

            packageDetails.prebuildsPath = path.join(this.prebuildsFolder, prebuildsDetails.prebuildPath)
            packageDetails.prebuildsArchAndPlatformPath = arcPlatformPath
            packageDetails.prebuildsArchAndPlatformAbiPath = path.join(arcPlatformPath, nodeApiFileName)
             
            return true
        }))
    }

    private async DoPatch(packages:any){
        new Patcher(this.patcherOptions).Patch(packages)
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
        }).map((pD:any) => {
            if (!(pD.name in availableNativeModules)){
                throw new Error(`The package '${pD.name}' in not installed for your project.`)

            }

            if (!semver.satisfies(availableNativeModules[pD.name].version, pD.version)){
                throw new Error(`The installed version of the package '${pD.name}' has different version. Installed version '${availableNativeModules[pD.name].version}'. Required version '${pD.version}'`)
            }

            return availableNativeModules[pD.name]

        }).filter((pD:any) => pD != null)


        this.DoPatch(this.ValaidateAndGetNativeModulesToPatch(nativeModulesToPatch, arch, platform, runtime))
        
    }

    async PatchAll(arch:any, platform:any, runtime:any){        
        const prebuildsAvailable = this.ValaidateAndGetNativeModulesToPatch(await this.GetProjectNativeModules(), arch, platform, runtime)
        this.DoPatch(prebuildsAvailable)

    }

    private async GetProjectNativeModules(projectPath:string=this.projectDir, filter:(moduleName: string, realPath:string) => boolean = null): Promise<INativeModuleToPatch>{
        const nodeModulesPath = path.join(projectPath, "node_modules")

        let nodeModulesPaths = new Set([])
        let modulePaths = new Set([])
        let nativeModules:INativeModuleToPatch = {}

        const _getNativeModules = async (_nodeModulesPath:string) => {
            const realNodeModulesPath = await fsExtra.realpath(_nodeModulesPath);
            if (nodeModulesPaths.has(realNodeModulesPath)) {
                return;
            }
            nodeModulesPaths.add(realNodeModulesPath);
            console.log('scanning:', realNodeModulesPath);
            for (const modulePath of await fsExtra.readdir(realNodeModulesPath)) {
                if (modulePath === '.bin')
                    continue;
        
                const realPath = await fsExtra.realpath(path.resolve(_nodeModulesPath, modulePath));
                if (modulePaths.has(realPath)) {
                    continue;
                }
                modulePaths.add(realPath);
        
                if (await fsExtra.pathExists(path.resolve(realPath, 'binding.gyp'))) {
                    if (filter && !filter(modulePath, realPath)){
                        continue
                    }

                    const packageJson= JSON.parse((await fsExtra.readFile(path.join(realPath, "package.json"))).toString())
                    nativeModules[packageJson.name]  = {
                        name:packageJson.name,
                        version:packageJson.version,
                        path:realPath
                    }
                }
        
                //TODO: MR This
                if (modulePath.startsWith('@')) {
                    await _getNativeModules(path.resolve(realPath, `${modulePath}/`));
                }
                if (await fsExtra.pathExists(path.resolve(_nodeModulesPath, modulePath, 'node_modules'))) {
                    await _getNativeModules(path.resolve(realPath, 'node_modules'));
                }
            }
        }

        await _getNativeModules(nodeModulesPath)
        return nativeModules
        
    }
}
