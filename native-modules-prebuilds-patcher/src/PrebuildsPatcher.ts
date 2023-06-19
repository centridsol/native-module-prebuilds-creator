
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


// PatchAll(arch, platfomrm, electronVErsion) -  Patchs all the modules with existing
// Patch()
// GetProjectNativeModule()
// PatchAllProjectNAtiveModules()

// var fs = require('fs');
// var path = require('path');

// function _patchPackage(installedPackagePath, installedPackageJson, prebuiltDetails){
//     copyFolderRecursiveSync(path.join(__dirname, prebuiltDetails.prebuildPath), path.join(installedPackagePath, "prebuilds"))
    
//     if (!("scripts" in installedPackageJson)){
//         installedPackageJson["scripts"] = {}
//     }

//     if (!("install" in installedPackageJson.scripts)){
//         installedPackageJson.scripts["install"] = "node-gyp-build"
//     }
// }

// function getPrebuildManifest(){
//     return JSON.parse(fs.readFileSync(path.join(__dirname, "prebuild-manifest.json")).toString())
// }

// function validateAndSetDefaultProps(opt){
//     if (!opt.projectDir){
//         opt.projectDir = process.cwd()
//     }

//     const nodeModulePath = path.join(opt.projectDir, "node_modules")
//     if (!fs.existsSync(nodeModulePath)){
//         throw new Error(`Could not find the node_modules folder for the project path '${opt.projectDir}'`)
//     }
//     opt.nodeModuleFolder = nodeModulePath

//     if (!fs.existsSync(path.join(nodeModulePath, "node-gyp-build"))){
//         throw new Error(`The pactcher script requires node-gyp-build to be installed. Please install it with 'npm install --save node-gyp-build' (or yarn)`)
//     }

//     if (!opt.onVersionMismatch){
//         opt.onVersionMismatch = 'error'
//     }
// }

// /**
//  * 
//  * @param {Object[]} packageDetails 
//  * @param {string} packageDetails[].name 
//  * @param {string} packageDetails[].version 
//  * @param {Object} opt
//  * @param {string} opt.projectDir
//  * @param {'error' | 'force' | 'skip'} opt.onVersionMismatch
//  */
// function patch(packageDetails, opt){
//     validateAndSetDefaultProps(opt)

//     const prebuildManifest = getPrebuildManifest()

//     const validateAndGetInstalledNodePackage = function(nativePackage) {
//         const installedPackageFolder = path.join(opt.nodeModuleFolder, nativePackage.name)
//         if (!fs.existsSync(installedPackageFolder)){
//             throw new Error(`Cannot patch the package '${nativePackage.name}' as it does not exist in the node_modules folder`)
//         }

//         const packagePath = path.join(installedPackageFolder, "package.json")
//         if (!fs.existsSync(packagePath)){
//             throw new Error(`The specified module '${nativePackage.name}' does not seem to be a node module.`)
//         }

//         const packageJson = JSON.parse(fs.readFileSync(packagePath).toString())

//         //TODO: Limitation - version has to be exact. Consider using semver to better checks
//         if (nativePackage.version && nativePackage.version != packageJson.version){
//             if (opt.onVersionMismatch == 'error'){
//                 throw new Error(`Could not patch the package '${nativePackage.name}'. Installed version '${packageJson.version}'. Trying to patch version '${nativePackage.version}'`)
//             }

//             if (opt.onVersionMismatch == 'skip'){
//                 console.log(`Skipping patching the package '${nativePackage.name}'. Installed version '${packageJson.version}'. Trying to patch version '${nativePackage.version}' `)
//                 return [installedPackageFolder, packageJson, 'skip']
//             }

//             if (opt.onVersionMismatch == 'force'){
//                 console.log(`Version mismatch the package '${nativePackage.name}'. Installed version '${packageJson.version}'. Trying to patch version '${nativePackage.version}'. Will use the lastest prebuilt version instead. `)
                
//                 return [installedPackageFolder, packageJson, 'continue']
//             }

//         }
//         return [installedPackageFolder, packageJson, 'continue']

//     }

//     const validateAndGetPreBuiltPackageDetails = function(nativePackage, installedPackageJson, action){
//         if (!(nativePackage.name in prebuildManifest)){
//             throw new Error(`No prebuilds found for the package ${nativePackage.name}`)
//         }

//         const prebuiltPackageDetails = prebuildManifest[nativePackage.name]
//         if (!(nativePackage.version in prebuiltPackageDetails)){
//             throw Error(`Could not find prebuilds versions for the package '${nativePackage.name}@${nativePackage.version}'. Available prebuilt versions are listed below:- \n\n${Object.keys(prebuiltPackageDetails).join(', ')}`)
//         }

//         return prebuiltPackageDetails[nativePackage.version]
        
//     }

//     for(const nativePackage of packageDetails){
//         const [installedPackagePath, installedPackageJson, action] = validateAndGetInstalledNodePackage(nativePackage)
//         if (action == 'skip') {
//             continue
//         }

//         const prebuiltDetails = validateAndGetPreBuiltPackageDetails(nativePackage, installedPackageJson, action)
//         _patchPackage(installedPackagePath, installedPackageJson, prebuiltDetails)
        
//     }

// }


// function copyFolderRecursiveSync(source, destination) {
//     if (fs.lstatSync(source).isDirectory()) {
//       if (!fs.existsSync(destination)) {
//         fs.mkdirSync(destination);
//       }

//       const files = fs.readdirSync(source);
  
//       files.forEach(file => {
//         const originalPath = path.join(source, file);
//         const newPath = path.join(destination, file);
  
//         if (fs.lstatSync(originalPath).isDirectory()) {
//           copyFolderRecursiveSync(originalPath, newPath);
//         } else {
//           fs.copyFileSync(originalPath, newPath);
//         }
//       });
//     } else {
//       fs.copyFileSync(source, destination);
//     }
//   }
// module.exports = {
//     patchNativeModules: patch
// }