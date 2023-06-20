import { TestHelper } from "../../../testUtils/Helper"
import path from "path"
import fsExtra from "fs-extra"
import { INativeModuleToPatchDetails } from "../../src/IPrebuildsPatcher"
import { PreBuildifyBuilder } from "../../../native-modules-prebuilds-creator/src/Operations/PreBuildifyBuilder"
import { PreBuildsCopier } from "../../../native-modules-prebuilds-creator/src/Operations/PreBuildsCopier"
import { PackageItem } from "../../../native-modules-prebuilds-creator/src/PackageItem"
import { IPackageItem, IPackageItemsToProcess } from "../../../native-modules-prebuilds-creator/src/IPrebuildsCreator"
import os from "os"
import { AvailableMockObjects  } from "../../../native-modules-prebuilds-creator/tests/Test.Utilities/MockObjects/MockObjectRegister"
import { TestMockObjectHelper } from "../../../native-modules-prebuilds-creator/tests/Test.Utilities/Helper"
import nodeAbi from 'node-abi'

export class PatcherTestHelper{

    static GetMockNodeModuleDir(){
        return TestHelper.GetTestTempDir("patcherTests/mock/node_modules")
    }

    static GetMockPrebuildsFolder(clean:boolean =true){
        const mockPrebuildsFolder:string = "patcherTests/mock/prebuild_folders"
        if(clean){
            TestHelper.CleanUpTempDir(mockPrebuildsFolder)
        }
        return TestHelper.GetTestTempDir(mockPrebuildsFolder)
    }
    static CreateMockPackage(name:string, additionalJson:any={}){

        const packagePath = path.join(PatcherTestHelper.GetMockNodeModuleDir(), name)
        TestHelper.CleanUpTempDir(packagePath)
        TestHelper.GetTestTempDir(packagePath)

        TestMockObjectHelper.CreateMockNativeModule(AvailableMockObjects.SimpleNative, {
            name:name,
            version: "1.0.0",
            ...additionalJson
        }, packagePath)

        return packagePath
    }


    static CreateMockProjectWithPrebuildifyPackage(name:string, prebuildsPaths:string[]=[]){
        let mockProjectPath =  PatcherTestHelper.CreateMockPackage(name, {
            devDependencies: {
                "prebuildify": "latest"
            }
        })

        for (const prebuildPath of prebuildsPaths){
            
            const realPath:string = path.join(mockProjectPath, "prebuilds", prebuildPath)
            const prebuildsFolder = path.dirname(realPath)

            fsExtra.mkdirSync(prebuildsFolder, {recursive:true})
            fsExtra.writeFileSync(realPath, "")
        }

        return mockProjectPath
    }

    static GetPackagePatcherDetails(projectPath:string, prebuildFolder:any=null, arcPlatfom:any=null, abiVersion:any=null){
        let packageJson = JSON.parse(fsExtra.readFileSync(path.join(projectPath, "package.json")).toString())

        const prebuildsPath:any = prebuildFolder ? path.join(prebuildFolder, "prebuilds", `${packageJson.name}@${packageJson.version}`) : null
        const prebuildsArchAndPlatformPath:any =  arcPlatfom ? path.join(prebuildsPath, arcPlatfom) : null
        const prebuildsArchAndPlatformAbiPath:any = abiVersion ? path.join(prebuildsArchAndPlatformPath, abiVersion) : null

        return {
            name: packageJson.name,
            version: packageJson.version,
            path: projectPath,
            prebuildsPath,
            prebuildsArchAndPlatformPath,
            prebuildsArchAndPlatformAbiPath
        }
    }
    
    static async CreateMockPrebuildsProject(packageDetails:any, dist:string){
        const mockManifest:any = {}
        for (const [packageN, packageD] of Object.entries(packageDetails)){
            mockManifest[packageN] = {}

            for (const [packageVersion, prebuildPaths] of Object.entries(packageD as any)){
                const packagePrebuildPath:string = path.join("prebuilds", `${packageN}@${packageVersion}`)
                mockManifest[packageN][packageVersion] ={
                    prebuildPath: packagePrebuildPath
                }

                for (const pP of prebuildPaths as string[]){
                    const prebuildsBuilds = path.join(dist, packagePrebuildPath, pP)
                    const prebuildsFolder = path.dirname(prebuildsBuilds)

                    fsExtra.mkdirSync(prebuildsFolder, {recursive:true})
                    fsExtra.writeFileSync(prebuildsBuilds, pP)
                }

            }
        }

        fsExtra.writeFileSync(path.join(dist, "prebuild-manifest.json"), JSON.stringify(mockManifest, null, 4))
    }

    // static async BuildMockProject(packageDetails:any){
    //     let packageJson = JSON.parse(fsExtra.readFileSync(path.join(packageDetails.path, "package.json")).toString())

    //     const packageItem:IPackageItem = new PackageItem( {
    //         packageName: packageJson.name,
    //         version: packageJson.version
    //     }, {
    //         arch: os.arch(),
    //         platform: os.platform(),
    //         targets: [],
    //         ...(packageDetails.prebuildify || {})
    //     })
    //     .SetSourcePath(packageDetails.path)
    //     .SetOtherPackageDetails({
    //         tarball_url: "",
    //         id:`${packageJson.name}@${packageJson.version}`,
    //         version: packageJson.version
    //     })
    //     .SetPackageJson(packageJson)
                                
          
                                
    //     await new PreBuildifyBuilder({}).Prebuildifier(packageItem)
    //     return packageItem
    // }

    // static async CreatePrebuildsProject(packageDetails:any[], dist:string){

    //     let packageItems:IPackageItemsToProcess = {}
    //     for (const packageDetail of packageDetails){
    //         const packageItem:IPackageItem = await this.BuildMockProject(packageDetail)
    //         packageItems[packageItem.packageName] = packageItem
    //     }
        
    //     new PreBuildsCopier(packageItems).Copy(dist)
    //     return packageItems
    // }

    // static PackageItemToPactherDetails(packageToProcess:IPackageItemsToProcess,  dist:string){
    //     return Object.values(packageToProcess).reduce((pv:any, p:IPackageItem) => {
    //         const prebuildsPath:string =  path.join(dist, "prebuilds", `${p.packageName}@${p.packageVersion}`)
    //         const prebuildsArchAndPlatformPath:string =  path.join( p.prebuildPaths, `${p.mergedPrebuildifyOptions.platform}-${p.mergedPrebuildifyOptions.arch}`)
    //         const prebuildsArchAndPlatformAbiPath = path.join(prebuildsArchAndPlatformPath, 
    //                                                             // @ts-ignore
    //                                                           `${nodeAbi.getAbi(p.mergedPrebuildifyOptions.targets[0].target, p.mergedPrebuildifyOptions.targets[0].runtime)}.node`)
    //         pv[p.packageName] = {
    //             name: p.packageName,
    //             version: p.packageVersion,
    //             path: p.sourcePath,
    //             prebuildsPath,
    //             prebuildsArchAndPlatformPath,
    //             prebuildsArchAndPlatformAbiPath
    //         }
    //         return pv
    //     }, {})
    // }
}  