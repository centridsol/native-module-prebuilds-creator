import { INativeModuleToPatchDetails, IPatchStrategies } from "../../src/IPrebuildsPatcher"
import { BuiltPatcherStratgey, PrebuildifyPatcherStratgey, UnbuiltPatcherStratgey } from "../../src/Patcher/PatcherStrategies"
import { PatcherTestHelper } from "../Test.Utilities/PatcherTestHelper"
import nodeAbi from 'node-abi'
import os from "os"
import fsExtra from "fs-extra"
import path from "path"
import { spawnSync } from "child_process"

describe("Pacther Strategies", () => {

    describe("UnbuiltPatcherStrategy test", () => {
        it("Can check if strategy applicable", async () => {
            const mockProjectPath = PatcherTestHelper.CreateMockPackage("test-module-unbuilt")

            const nativeModulePatchDetails:INativeModuleToPatchDetails = PatcherTestHelper.GetPackagePatcherDetails(mockProjectPath)
            expect(new UnbuiltPatcherStratgey(nativeModulePatchDetails, {
                forceRebuildOnNoBindings: true
            }).CanPatch()).toBeTruthy()

            expect(new UnbuiltPatcherStratgey(nativeModulePatchDetails, {}).CanPatch()).toBeFalsy()
        })

        it("Can patch correctly", async () => {
            const prebuildFolder:string =  PatcherTestHelper.GetMockPrebuildsFolder()
            const mockProjectPath = PatcherTestHelper.CreateMockPackage("test-module-unbuilt")

            PatcherTestHelper.CreateMockPrebuildsProject({
                "test-module-unbuilt": {
                    "1.0.0": [ "win32-x64/electron.abi116.node"]
                }
            }, prebuildFolder)
            
            const nativeModulePatchDetails = PatcherTestHelper.GetPackagePatcherDetails(mockProjectPath,  
                                                                                prebuildFolder, 
                                                                                "win32-x64", 
                                                                                "electron.abi116.node" )
            const buildPactherStrategy:UnbuiltPatcherStratgey = new UnbuiltPatcherStratgey(nativeModulePatchDetails, {
                forceRebuildOnNoBindings: true
            })
            expect(buildPactherStrategy.Patch()).toBeTruthy()
            expect(fsExtra.readFileSync(buildPactherStrategy["bindingPath"]).toString()).toEqual("win32-x64/electron.abi116.node")
        })
    })

    describe("BuiltPatcherStratgey test", () => {
        it("Can check if strategy applicable", async () => {
            const mockProjectPath = PatcherTestHelper.CreateMockPackage("test-module-build")
            spawnSync("npm", ["run", "build"], { stdio: 'inherit', cwd: mockProjectPath})

            const nativeModulePatchDetails:INativeModuleToPatchDetails = PatcherTestHelper.GetPackagePatcherDetails(mockProjectPath)
            expect(new BuiltPatcherStratgey(nativeModulePatchDetails, {}).CanPatch()).toBeTruthy()
        })
        
        it("Can patch correctly", async () => {
            const prebuildFolder:string =  PatcherTestHelper.GetMockPrebuildsFolder()

            const mockProjectPath = PatcherTestHelper.CreateMockPackage("test-module-build")
            spawnSync("npm", ["run", "build"], { stdio: 'inherit', cwd: mockProjectPath})

            PatcherTestHelper.CreateMockPrebuildsProject({
                "test-module-build": {
                    "1.0.0": [ "win32-x64/electron.abi116.node"]
                }
            }, prebuildFolder)
            
            const nativeModulePatchDetails = PatcherTestHelper.GetPackagePatcherDetails(mockProjectPath,  
                                                                                prebuildFolder, 
                                                                                "win32-x64", 
                                                                                "electron.abi116.node" )
            const buildPactherStrategy: BuiltPatcherStratgey = new BuiltPatcherStratgey(nativeModulePatchDetails, {})
            expect(buildPactherStrategy.Patch()).toBeTruthy()
            expect(fsExtra.readFileSync(buildPactherStrategy["bindingPath"]).toString()).toEqual("win32-x64/electron.abi116.node")
        })
    })

    describe("PrebuildifyPatcherStratgey test", () => {
        const ValidatePrebuildsPatch = (projectPath:string, prebuildsToCheck:string[]) => {
            for (const prebuildToCheck of prebuildsToCheck){
                expect(fsExtra.existsSync(path.join(projectPath, "prebuilds", prebuildToCheck))).toBeTruthy()
            }
        }

        it("Can check if strategy applicable", () => {
            let  mockProjectPath = PatcherTestHelper.CreateMockProjectWithPrebuildifyPackage("test-module")
            const nativeModulePatchDetails:INativeModuleToPatchDetails = PatcherTestHelper.GetPackagePatcherDetails(mockProjectPath)

            expect(new PrebuildifyPatcherStratgey(nativeModulePatchDetails, {}).CanPatch()).toBeTruthy()
        })

        it("Can patch correctly", async () => {
            const target = nodeAbi.supportedTargets.slice(-1)
            const prebuildFolder:string =  PatcherTestHelper.GetMockPrebuildsFolder()

            const existingPrebuilds:string[] = [
                "win32-x64/electron.abi113.node",
                "linux-x64/electron.abi113.node",
            ]
            const mockProjectPath = PatcherTestHelper.CreateMockProjectWithPrebuildifyPackage("test-module", existingPrebuilds)


            PatcherTestHelper.CreateMockPrebuildsProject({
                "test-module": {
                    "1.0.0": [ "linux-x64/electron.abi116.node"]
                }
            }, prebuildFolder)
            
            const nativeModulePatchDetails = PatcherTestHelper.GetPackagePatcherDetails(mockProjectPath,  
                                                                                prebuildFolder, 
                                                                                "linux-x64", 
                                                                                "electron.abi116.node" )
            

            expect(new PrebuildifyPatcherStratgey(nativeModulePatchDetails, {}).Patch()).toBeTruthy()
            const newPrebuildsPath:string = `${os.platform()}-${os.arch()}/${target[0].runtime}.abi${nodeAbi.getAbi(target[0].target, target[0].runtime)}.node`
            ValidatePrebuildsPatch(mockProjectPath, [newPrebuildsPath, ...existingPrebuilds])
        })
    })
})