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

    static CreateNativeModuleDetails(packagePath:string, overrides:any={}){
        let packageJson = JSON.parse(fsExtra.readFileSync(path.join(packagePath, "package.json")).toString())

        return {
            name: packageJson.name,
            version: packageJson.version,
            path: packagePath,
            prebuildsPath:null,
            prebuildsArchAndPlatformPath:null,
            prebuildsArchAndPlatformAbiPath:null,
            ...overrides} as INativeModuleToPatchDetails
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

    static async CreateMockPrebuildsProject(packageDetails:any[], dist:string){

        let packageItems:IPackageItemsToProcess = {}
        for (const packageDetail of packageDetails){
            let packageJson = JSON.parse(fsExtra.readFileSync(path.join(packageDetail.path, "package.json")).toString())

            packageItems[packageJson.name] = new PackageItem( {
                packageName: packageJson.name,
                version: packageJson.version
            }, {
                arch: os.arch(),
                platform: os.platform(),
                targets: [],
                ...(packageDetail.prebuildify || {})
            })
            .SetSourcePath(packageDetail.path)
            .SetOtherPackageDetails({
                tarball_url: "",
                id:`${packageJson.name}@${packageJson.version}`,
                version: packageJson.version
            })
            .SetPackageJson(packageJson)
                                    
              
                                    
            await new PreBuildifyBuilder({}).Prebuildifier(packageItems[packageJson.name])
        }
        
        new PreBuildsCopier(packageItems).Copy(dist)

        return Object.values(packageItems).reduce((pv:any, p:IPackageItem) => {
            const prebuildsPath:string =  path.join(dist, "prebuilds", `${p.packageName}@${p.packageVersion}`)
            const prebuildsArchAndPlatformPath:string =  path.join( p.prebuildPaths, `${p.mergedPrebuildifyOptions.platform}-${p.mergedPrebuildifyOptions.arch}`)
            const prebuildsArchAndPlatformAbiPath = path.join(prebuildsArchAndPlatformPath, 
                                                                // @ts-ignore
                                                              `${nodeAbi.getAbi(p.mergedPrebuildifyOptions.targets[0].target, p.mergedPrebuildifyOptions.targets[0].runtime)}.node`)
            pv[p.packageName] = {
                name: p.packageName,
                version: p.packageVersion,
                path: p.sourcePath,
                prebuildsPath,
                prebuildsArchAndPlatformPath,
                prebuildsArchAndPlatformAbiPath
            }
            return pv
        }, {})
    }
}  