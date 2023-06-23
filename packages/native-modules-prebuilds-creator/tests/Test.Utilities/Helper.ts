
import fsExtra from "fs-extra"
import { MockObjectRegister } from "./MockObjects/MockObjectRegister"
import { TestHelper } from "../../../../testUtils/Helper"
import os from "os"
import path from "path"
import { PackageItem } from "../../src/PackageItem"
import { rimrafSync } from "rimraf"


export class TestMockObjectHelper{
    static CreateMockNativeModule(mockObjectId:string, additionalPackageJson:any, outputPathId:any = null){
        const mockNativeDir:string =outputPathId ? outputPathId : `mockNative/${mockObjectId}`
        TestHelper.CleanUpTempDir(mockNativeDir)
        const outDir = TestHelper.GetTestTempDir(mockNativeDir)
        fsExtra.copySync(MockObjectRegister[mockObjectId].srcPath, outDir)

        const existingBuildPath = path.join(outDir, "build")
        if (fsExtra.existsSync(existingBuildPath)){
            rimrafSync(existingBuildPath)
        }

        const mainSrcPath = path.join(outDir, "src/main.cc")
        fsExtra.writeFileSync(mainSrcPath, fsExtra.readFileSync(mainSrcPath).toString().replace("<<SIMPLE_NATIVE_ID>>", outputPathId ? outputPathId : mockObjectId))

        const packageJsonPath:string = path.join(outDir, "package.json")
        const packageJson:any = JSON.parse(fsExtra.readFileSync(packageJsonPath).toString())
        fsExtra.writeFileSync(packageJsonPath, JSON.stringify({...packageJson, ...additionalPackageJson}))

        return outDir
    }

    static GetMockPrebuildifyProps(override:any={}){
        return {
            arch: os.arch(),
            platform: os.platform(),
            targets: [],
            ...(override || {})
        }
    }

    static GetPackageItemFromNativeModule(nativeModuleId:string, additionalPackageJson:any={},  gloablPrebuildifyOpts:any=null, outFolder:any=null){
        const outPath = TestMockObjectHelper.CreateMockNativeModule(nativeModuleId, additionalPackageJson, outFolder)

        const packageJson:any =  JSON.parse(fsExtra.readFileSync(path.join(outPath, "package.json")).toString()) 
        
        return new PackageItem( {
            packageName: packageJson.name,
            version: packageJson.version
        }, TestMockObjectHelper.GetMockPrebuildifyProps(gloablPrebuildifyOpts))
                                .SetSourcePath(outPath)
                                .SetOtherPackageDetails({
                                    tarball_url: "",
                                    id:`${packageJson.name}@${packageJson.version}`,
                                    version: packageJson.version
                                })
                                .SetPackageJson(packageJson)
    }
}