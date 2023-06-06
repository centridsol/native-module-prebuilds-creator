
import fsExtra from "fs-extra"
import { MockObjectRegister } from "./MockObjects/MockObjectRegister"
import { TestHelper } from "../../../testUtils/Helper"
import os from "os"
import path from "path"


export class TestMockObjectHelper{
    static CreateMockNativeModule(mockObjectId:string, additionalPackageJson:any, outputPath:any = null){
        const mockNativeDir:string =outputPath ? outputPath : `mockNative/${mockObjectId}`
        TestHelper.CleanUpTempDir(mockNativeDir)
        const outDir = TestHelper.GetTestTempDir(mockNativeDir)
        fsExtra.copySync(MockObjectRegister[mockObjectId].srcPath, outDir)

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
            ...override
        }
    }
}