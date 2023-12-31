import { PatcherTestHelper } from "./Test.Utilities/PatcherTestHelper"
import { PrebuildsPatcher } from "../src/PrebuildsPatcher"
import path from "path"
import os from "os"
import fs from "fs"
import { IPactherOptions } from "../src/IPrebuildsPatcher"
import { TestHelper } from "../../../Shared/TestUtils/Helper"
import { rimrafSync } from "rimraf"
import { Consts } from "../src/Utilities/Consts"

describe("Prebuilds patcher tests", () => {
    describe("Can revert backup", () => {

        let mockPrebuildInstance:PrebuildsPatcher
        const backUpDir = path.join(os.tmpdir(), Consts.BACKUP_DIR_NAME)

        beforeEach(()=> {
            
            if (fs.existsSync(backUpDir)){
                rimrafSync(backUpDir)
            }
        
            TestHelper.CleanUpTempDir(PatcherTestHelper.GetMockNodeModuleDir())
            PatcherTestHelper.CreateMockPackage("test-m1")
            mockPrebuildInstance = getPrebuildsPatcherInstance({
                "test-m1": {
                    "1.0.0": [ "win32-x64/electron.abi116.node", 
                                "linux-x64/electron.abi116.node"]
                },
            }, {
                projectPath: path.dirname(PatcherTestHelper.GetMockNodeModuleDir())
            })
        })

        it("Does not revert package in different projects",async ()=>{
            await mockPrebuildInstance.Patch(["test-m1@1.0.0"],"x64", "win32", "electron@25.0.0")

            const packagePath:string = path.join(PatcherTestHelper.GetMockNodeModuleDir(), "test-m1")
            const initalPatchHash = TestHelper.GenerateFolderHashSync(packagePath)
            
            mockPrebuildInstance.SetProjectPath(TestHelper.GetTestTempDir("randomPath"))
            await mockPrebuildInstance.RevertPatches()

            expect(fs.existsSync(path.join(packagePath, Consts.BACKUP_JSON_NAME))).toBeTruthy()
            expect(TestHelper.GenerateFolderHashSync(packagePath)).toEqual(initalPatchHash)
        })

        it("Does not revert packages with different version",async ()=>{
            await mockPrebuildInstance.Patch(["test-m1@1.0.0"],"x64", "win32", "electron@25.0.0")

            const packagePath:string = path.join(PatcherTestHelper.GetMockNodeModuleDir(), "test-m1")

            fs.writeFileSync(path.join(PatcherTestHelper.GetMockNodeModuleDir(), "test-m1", "package.json"), JSON.stringify({
                name: "test-m1",
                version: "2.0.0"
            }))
            await mockPrebuildInstance.RevertPatches()

            expect(fs.existsSync(path.join(packagePath, Consts.BACKUP_JSON_NAME))).toBeTruthy()
        })

        it("It doesnt repatch if already patched", async () => {
            const getFileHashDetails = () => {
                const stats = fs.statSync(path.join(PatcherTestHelper.GetMockNodeModuleDir(), "test-m1", Consts.BACKUP_JSON_NAME))
                return `${stats.mtime.getTime()}-${stats.ctime.getTime()}`
            }
            await mockPrebuildInstance.Patch(["test-m1@1.0.0"],"x64", "win32", "electron@25.0.0")
            const initalPatchStats = getFileHashDetails()

            await mockPrebuildInstance.Patch(["test-m1@1.0.0"],"x64", "win32", "electron@25.0.0")
            expect(initalPatchStats).toEqual(getFileHashDetails())

        })

        it("Can Revert back packages", async () => {
            const packagePath:string = path.join(PatcherTestHelper.GetMockNodeModuleDir(), "test-m1")
            const initalPatchHash = TestHelper.GenerateFolderHashSync(packagePath)

            await mockPrebuildInstance.Patch(["test-m1@1.0.0"],"x64", "win32", "electron@25.0.0")
            await mockPrebuildInstance.RevertPatches()

            expect(fs.existsSync(path.join(PatcherTestHelper.GetMockNodeModuleDir(), "test-m1", Consts.BACKUP_JSON_NAME))).toBeFalsy()
            expect(TestHelper.GenerateFolderHashSync(packagePath)).toEqual(initalPatchHash)
        })

        it("Auto reverts on error", async () => {

            mockPrebuildInstance = getPrebuildsPatcherInstance({
                "test-m1": {
                    "1.0.0": [ "win32-x64/electron.abi116.node", 
                                "linux-x64/electron.abi116.node"]
                },
            }, {
                projectPath: path.dirname(PatcherTestHelper.GetMockNodeModuleDir()),
                forceRebuildOnNoBindings: false
            })

            const packagePath:string = path.join(PatcherTestHelper.GetMockNodeModuleDir(), "test-m1")
            const initalPatchHash = TestHelper.GenerateFolderHashSync(packagePath)
            
            try{
                await mockPrebuildInstance.Patch(["test-m1@1.0.0"],"x64", "win32", "electron@25.0.0")
            }catch(err:any){}
            
            expect(fs.existsSync(path.join(PatcherTestHelper.GetMockNodeModuleDir(), "test-m1", Consts.BACKUP_JSON_NAME))).toBeFalsy()
            expect(TestHelper.GenerateFolderHashSync(packagePath)).toEqual(initalPatchHash)

        })
    })

    const getPrebuildsPatcherInstance = (mockPrebuildsData:any = {}, patcherOptions:IPactherOptions={}) => {
        const prebuildFolder = PatcherTestHelper.GetMockPrebuildsFolder()

        if (mockPrebuildsData){
            PatcherTestHelper.CreateMockPrebuildsProject(mockPrebuildsData, prebuildFolder)
        }

        return new PrebuildsPatcher(path.join(prebuildFolder, "prebuild-manifest.json"), patcherOptions)
    }


    describe(" ValaidateAndGetNativeModulesToPatch tests", () => {
        let mockPrebuildInstance:PrebuildsPatcher
        let mockPrebuildInstanceErrorOnNoPrebuilds:PrebuildsPatcher

        beforeAll(() => {
            mockPrebuildInstance = getPrebuildsPatcherInstance({
                "test-module": {
                    "1.0.0": [ "win32-x64/electron.abi116.node", 
                                "linux-x64/electron.abi116.node"]
                }
            })

            mockPrebuildInstanceErrorOnNoPrebuilds = getPrebuildsPatcherInstance({
                "test-module": {
                    "1.0.0": [ "win32-x64/electron.abi116.node", 
                                "linux-x64/electron.abi116.node"]
                }
            }, {onNoPrebuildsFound: 'error'})
        })

        it("Removes native packages with no prebuilds", () => {
            const nativeModulesToPath = mockPrebuildInstance["ValaidateAndGetNativeModulesToPatch"]({ 
                unknown: {
                    name: "unknown",
                    version: "1.0.0",
                    path: ""
                }
            }, os.arch(), os.platform(), "")

            expect(nativeModulesToPath).toEqual({})
        })

        it("Removes native packages with no matching prebuild version", () => {
            const nativeModulesToPath = mockPrebuildInstance["ValaidateAndGetNativeModulesToPatch"]({ 
                "test-module": {
                    name: "test-module",
                    version: "2.0.0",
                    path: ""
                }
            }, os.arch(), os.platform(), "")

            expect(nativeModulesToPath).toEqual({})
        })


        it("Throw error when runtime invalid", () => {

            let nativeModulesToPathFunc = () => mockPrebuildInstance["ValaidateAndGetNativeModulesToPatch"]({ 
                "test-module": {
                    name: "test-module",
                    version: "1.0.0",
                    path: ""
                }
            }, os.arch(), os.platform(), "")

            expect(nativeModulesToPathFunc).toThrowError("The runtime value must have the format [runtime]@[version]")

             nativeModulesToPathFunc = () => mockPrebuildInstance["ValaidateAndGetNativeModulesToPatch"]({ 
                "test-module": {
                    name: "test-module",
                    version: "1.0.0",
                    path: ""
                }
            }, os.arch(), os.platform(), "unknownRuntime@1.0.0")

            expect(nativeModulesToPathFunc).toThrowError("Could not detect abi for version 1.0.0 and runtime unknownRuntime")

        })

        it("Remove native packages with no matching runtime version", () => {
            const nativeModulesToPath = mockPrebuildInstance["ValaidateAndGetNativeModulesToPatch"]({ 
                "test-module": {
                    name: "test-module",
                    version: "1.0.0",
                    path: ""
                }
            }, os.arch(), os.platform(), "node@20.0.0")

            expect(nativeModulesToPath).toEqual({})
        })

        it("Get correct native package details", () => {
            const prebuildsFolder =  path.join(PatcherTestHelper.GetMockPrebuildsFolder(false), "prebuilds", "test-module@1.0.0")

            const nativeModulesToPath = mockPrebuildInstance["ValaidateAndGetNativeModulesToPatch"]({ 
                "test-module": {
                    name: "test-module",
                    version: "1.0.0",
                    path: ""
                }
            }, os.arch(), os.platform(), "electron@25.0.0-alpha.1")

            expect(nativeModulesToPath).toEqual({ 
                "test-module": {
                    name: "test-module",
                    version: "1.0.0",
                    path: "",
                    prebuildsPath: prebuildsFolder,
                    prebuildsArchAndPlatformPath: path.join(prebuildsFolder, `${os.platform()}-${os.arch()}`),
                    prebuildsArchAndPlatformAbiPath: path.join(prebuildsFolder, `${os.platform()}-${os.arch()}`, "electron.abi116.node")
                }
            })
        })
    })

    describe("Can do patching tests", () => {
        let mockPrebuildInstance:PrebuildsPatcher
        const mockPackages = ["test-m1", "test-m2", "test-m3", "test-m4"]
        beforeAll(()=> {
            
            mockPrebuildInstance = getPrebuildsPatcherInstance({
                "test-m1": {
                    "1.0.0": [ "win32-x64/electron.abi116.node", 
                                "linux-x64/electron.abi116.node"]
                },
                "test-m2": {
                    "2.0.0": [ "win32-x64/electron.abi116.node", 
                                "linux-x64/electron.abi116.node"]
                },
                "test-m3": {
                    "1.0.0": ["linux-x64/electron.abi116.node"]
                },
                "test-m4": {
                    "1.0.0": ["win32-x64/electron.abi116.node"]
                }
            }, {
                projectPath: path.dirname(PatcherTestHelper.GetMockNodeModuleDir())
            })
        })

        beforeEach(()=>{
            TestHelper.CleanUpTempDir(PatcherTestHelper.GetMockNodeModuleDir())
            for (const packageName of mockPackages){
                PatcherTestHelper.CreateMockPackage(packageName)
            }
        })

        it("Can get native modules", async () => {
            expect(await mockPrebuildInstance["GetProjectNativeModules"]()).toEqual(mockPackages.reduce((pv:any, cv:any)=>{
                pv[cv] = {
                    name: cv,
                    path: path.join(PatcherTestHelper.GetMockNodeModuleDir(), cv),
                    version: "1.0.0"
                }
                return pv
            }, {}))
        })

        it("Can Patch All (relevent)", async () => {
            await mockPrebuildInstance.PatchAll("x64", "win32", "electron@25.0.0")
            for (const p of ["test-m1", "test-m4"]){
                expect(fs.existsSync(path.join(PatcherTestHelper.GetMockNodeModuleDir(), p, Consts.BACKUP_JSON_NAME))).toBeTruthy()
            }

            for (const p of ["test-m2", "test-m3"]){
                expect(fs.existsSync(path.join(PatcherTestHelper.GetMockNodeModuleDir(), p, Consts.BACKUP_JSON_NAME))).toBeFalsy()
            }
        })

        describe("Can patch tests", () => {
            it("Errors when not matching native package", async () =>{
                try{
                    await mockPrebuildInstance.Patch(["test-m5@1.0.0"],"x64", "win32", "electron@25.0.0")
                    expect(false).toBeTruthy()
                }
                catch(err:any){
                    expect(err.message).toContain(`The package 'test-m5' in not installed for your project.`)
                }

                try{
                    await mockPrebuildInstance.Patch(["test-m3@2.0.0"],"x64", "win32", "electron@25.0.0")
                    expect(false).toBeTruthy()
                }
                catch(err:any){
                    expect(err.message).toContain(`The installed version of the package 'test-m3' has different version. Installed version '1.0.0'. Required version '2.0.0'`)
                }

                try{
                    await mockPrebuildInstance.Patch(["test-m3"],"x64", "win32", "electron@25.0.0")
                    expect(false).toBeTruthy()
                }
                catch(err:any){
                    expect(err.message).toContain(`Package to patch should have the format [package]@[version]`)
                }
            })

            it("Can patch specific", async () => {
                await mockPrebuildInstance.Patch(["test-m1@1.0.0", "test-m3@1.0.0", "test-m4@1.0.0"],"x64", "win32", "electron@25.0.0")
                for (const p of ["test-m1", "test-m4"]){
                    expect(fs.existsSync(path.join(PatcherTestHelper.GetMockNodeModuleDir(), p, Consts.BACKUP_JSON_NAME))).toBeTruthy()
                }
    
                for (const p of ["test-m3"]){
                    expect(fs.existsSync(path.join(PatcherTestHelper.GetMockNodeModuleDir(), p, Consts.BACKUP_JSON_NAME))).toBeFalsy()
                }
            })
        })
    })

    it("Can get project path", () => {
         expect( getPrebuildsPatcherInstance()["TryGetProjectPath"]()  ).toEqual(path.join(__dirname, ".."))   
    })
    
})