import { INativeModuleToPatchDetails } from "../../src/IPrebuildsPatcher"
import { PrebuildifyPatcherStratgey } from "../../src/Patcher/PatcherStrategies"
import { PatcherTestHelper } from "../Test.Utilities/PatcherTestHelper"
import nodeAbi from 'node-abi'
import os from "os"
import fsExtra from "fs-extra"
import path from "path"

describe("Pacther Strategies", () => {
    it.todo("Can load correct package settings", () => {

    })

    describe("PrebuildifyPatcherStratgey test", () => {
        const ValidatePrebuildsPatch = (projectPath:string, prebuildsToCheck:string[]) => {
            for (const prebuildToCheck of prebuildsToCheck){
                expect(fsExtra.existsSync(path.join(projectPath, "prebuilds", prebuildToCheck))).toBeTruthy()
            }
        }

        it("Can check in strategy applicable", () => {
            let  mockProjectPath = PatcherTestHelper.CreateMockProjectWithPrebuildifyPackage("test-module")
            const nativeModulePatchDetails:INativeModuleToPatchDetails = PatcherTestHelper.CreateNativeModuleDetails(mockProjectPath)

            expect(new PrebuildifyPatcherStratgey(nativeModulePatchDetails).IsApplicable()).toBeTruthy()
        })

        it("Can patch correctly", async () => {
            const target = nodeAbi.supportedTargets.slice(-1)
            let  mockProjectPath = PatcherTestHelper.CreateMockProjectWithPrebuildifyPackage("test-module")

            let packagePrebuildPathDetails = await PatcherTestHelper.CreateMockPrebuildsProject([{
                path: mockProjectPath,
                prebuildify: {
                    targets: target
                }
            }], PatcherTestHelper.GetMockPrebuildsFolder())

            const existingPrebuilds = [
                "win32-x64/electron.abi113.node",
                "linux-x64/electron.abi113.node",
            ]
            // remove already build vesion from above
            mockProjectPath = PatcherTestHelper.CreateMockProjectWithPrebuildifyPackage("test-module", existingPrebuilds)


            const prebuiltDetails = Object.values(packagePrebuildPathDetails)[0]
            const nativeModulePatchDetails:INativeModuleToPatchDetails = PatcherTestHelper.CreateNativeModuleDetails(mockProjectPath, prebuiltDetails)

            new PrebuildifyPatcherStratgey(nativeModulePatchDetails).Patch()
            const newPrebuildsPath:string = `${os.platform()}-${os.arch()}/${target[0].runtime}.abi${nodeAbi.getAbi(target[0].target, target[0].runtime)}.node`
            ValidatePrebuildsPatch(mockProjectPath, [newPrebuildsPath, ...existingPrebuilds])
        })
    })
})