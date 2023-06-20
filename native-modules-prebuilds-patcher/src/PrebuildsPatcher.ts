
import fsExtra from "fs-extra";
import nodeAbi from 'node-abi'
import path from "path";
import semver from "semver";
import { INativeModuleToPatch } from "./IPrebuildsPatcher";


export class PrebuildsPatcher{
    private prebuildsManifest:any
    private projectDir:string

    constructor(prebuildsPath:string){
        this.prebuildsManifest = JSON.parse(fsExtra.readFileSync(prebuildsPath).toString())
        //this.projectPath = this.TryGetProjectPath()
    }

    async SetProjectPath(projectDir:string){
        //TOD0: Validatae
        this.projectDir = projectDir

    }

    async RevertPatch(){

    }

    ValaidateAndGetNativeModulesToPatch(nativeModuleToPatch:INativeModuleToPatch, arch:any, platform:any, runtime:any){
        return Object.entries(nativeModuleToPatch).filter(([packagaeName, packageDetails]) => {
            if (!(packagaeName in this.prebuildsManifest)){
                console.warn(`No prebuilds found for the package ${packagaeName}. Skipping`)
                return false
            }

            const prebuildVersion:string = Object.keys(this.prebuildsManifest[packagaeName]).find((prebuildVersion:string) => {
                // TODO: Conside if reqursed on range. As it is it has to be extar
                return semver.satisfies(prebuildVersion, packageDetails.version)
            })

            if (!prebuildVersion){
                console.warn(`No prebuilds with the version ${packageDetails.version} found for the package ${packagaeName}. Skipping`)
                return false
            }

            const prebuildsDetails = this.prebuildsManifest[packagaeName][prebuildVersion]

            const arcPlatformPath:string = path.join(prebuildsDetails.prebuildPath, `${platform}-${arch}`)

            if (!fsExtra.exists(arcPlatformPath)){
                console.warn(`No prebuilds for the platform ${platform} and arch ${arch}found for the package ${packagaeName}. Skipping`)
                return false

            }

            if (!runtime.includes("@")){
                console.log(`The runtime value must have the format [runtime]@[version]`)
                return false
            }

            const pDetails = runtime.split("@")
            const runtimeDetails:any =  {
                runtime: pDetails[0],
                target: pDetails[1]
            }

            const targetAbi:string = nodeAbi.getAbi(runtimeDetails.target, runtimeDetails.runtime)
            
            const nodeApiFileName = fsExtra.readdirSync(arcPlatformPath).find((fp:string) => {
                return fp == `${runtimeDetails.target}.${targetAbi}.node`
            })

            if (!nodeApiFileName){
                console.log(`Could not find any prebuilds for the runtime '${runtimeDetails}'. Skipping`)
                return false
            }

            packageDetails.prebuildsPath = prebuildsDetails.prebuildPath
            packageDetails.prebuildsArchAndPlatformPath = arcPlatformPath
            packageDetails.prebuildsArchAndPlatformAbiPath = path.join(arcPlatformPath, nodeApiFileName)
             
            return true
        })
    }

    private async DoPatch(packages:any, arch:any, platform:any, runtime:any){
        // TODO: Bacup
        //TODO: Uses prebuilds //
        //TODO: Use Binding stategy
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
            return {
                name: p,
                version: "latest"
            }
        }).map((pD:any) => {
            if (!(pD.name in availableNativeModules)){
                console.warn(`The package '${pD.name}' in not installed for your project. Skipping`)
                return null
            }

            if (!(pD.version == "latest" || semver.satisfies(availableNativeModules[pD.name].version, pD.version))){
                console.warn(`The installed version of the package '${pD.name}' has different version. Installed version '${availableNativeModules[pD.name].version}'. Required version '${pD.version}'. Skipping`)
                return null
            }

            return availableNativeModules[pD.name]

        }).filter((pD:any) => pD != null)


        this.DoPatch(this.ValaidateAndGetNativeModulesToPatch(nativeModulesToPatch, arch, platform, runtime), arch, platform, runtime)
        
    }

    async PatchAll(arch:any, platform:any, runtime:any){        
        const prebuildsAvailable = this.ValaidateAndGetNativeModulesToPatch(await this.GetProjectNativeModules(), arch, platform, runtime)
        this.DoPatch(prebuildsAvailable, arch, platform, runtime)

    }

    async GetProjectNativeModules(nodeModulesPath:string=this.projectDir, filter:(moduleName: string, realPath:string) => boolean = null): Promise<INativeModuleToPatch>{
        // Extract from 
        let nodeModulesPaths = new Set([])
        let modulePaths = new Set([])
        let nativeModules:INativeModuleToPatch = {}

        const _getNativeModules = async (_nodeModulesPath:string) => {
            const realNodeModulesPath = await fsExtra.realpath(this.projectDir);
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
                    if (!(filter && filter(modulePath, realPath))){
                        continue
                    }
                    const packageJson= JSON.parse(await fsExtra.readFile(path.join(realPath, "package.json")).toString())
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
