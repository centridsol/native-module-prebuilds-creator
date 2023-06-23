import { spawnSync } from "child_process"
import { PatcherTestHelper } from "../Test.Utilities/PatcherTestHelper"
import { Patcher } from "../../src/Patcher/Patcher"
import fs from "fs"
import path from "path"
import os from "os"
import { INativeModuleToPatch } from "../../src/IPrebuildsPatcher"
import { Consts } from "../../src/Utilities/Consts"

describe("Patcher tests", () => {
    const getMockNativeModulesToPatch = (moduleDef:{[pn:string]: any}) => {
        let nativeModuleToPatch:any = {}
        const prebuildFolder:string = PatcherTestHelper.GetMockPrebuildsFolder()

        for (const [packageName,def] of Object.entries(moduleDef)){
            let mockProjectPath:string

            if (def.type == "prebuildfy"){
                mockProjectPath = PatcherTestHelper.CreateMockProjectWithPrebuildifyPackage(packageName, def.existingPrebuilds)
            }
            else {
                mockProjectPath = PatcherTestHelper.CreateMockPackage(packageName)
                if (def.type == "built"){
                    spawnSync("npm", ["run", "build"], { stdio: 'inherit', cwd: mockProjectPath})
                }
            }

            nativeModuleToPatch[packageName] = 
                PatcherTestHelper.GetPackagePatcherDetails(mockProjectPath,  
                                                            prebuildFolder, 
                                                            def.archAndPlatform, 
                                                            def.abiVersion)
        }

        PatcherTestHelper.CreateMockPrebuildsProject(Object.values(nativeModuleToPatch).reduce((pv:any, v:any)=> {
            if (!(v.name in pv)){
                pv[v.name] = {}
            }
            pv[v.name][v.version] = moduleDef[v.name].prebuilds
            return pv

        }, {}), prebuildFolder)
        
        return nativeModuleToPatch
    }
    
    it("Can patch multiple", () => {
        const nativeModulesToPatch = getMockNativeModulesToPatch({
            "mock-module-prebuilds": {
                type: "prebuildfy",
                existingPrebuilds: [
                    "win32-x64/electron.abi113.node",
                    "linux-x64/electron.abi113.node",
                ],
                prebuilds: [
                    "win32-x64/electron.abi116.node",
                    "linux-x64/electron.abi116.node"
                ],
                archAndPlatform: "win32-x64",
                abiVersion: "electron.abi116.node"
            },
            "mock-module-built": {
                type: "built",
                prebuilds: [
                    "win32-x64/electron.abi116.node"
                ],
                archAndPlatform: "win32-x64",
                abiVersion: "electron.abi116.node"
            },
            "mock-module-unbuilt": {
                type: "unbuilt",
                prebuilds: [
                    "win32-x64/electron.abi116.node",
                    "linux-x64/electron.abi116.node"
                ],
                archAndPlatform: "linux-x64",
                abiVersion: "electron.abi116.node"
            }

        })

        new Patcher({
            shouldBackup: false,
            forceRebuildOnNoBindings: true
        }).Patch(nativeModulesToPatch)
    })


    describe("Can backup packages", () => {
        const CheckBackUpsCreated = (nativeModulesToPatch:INativeModuleToPatch)=> {
            for (const nTP of Object.values(nativeModulesToPatch)){
                const backUpPath = path.join(os.tmpdir(), Consts.BACKUP_DIR_NAME, `${nTP.name}@${nTP.version}`)
                expect(fs.existsSync(backUpPath)).toBeTruthy()

                const packageJson = JSON.parse(fs.readFileSync(path.join(backUpPath, "package.json")).toString())
                expect(packageJson.name).toEqual(nTP.name)
                expect(packageJson.version).toEqual(nTP.version)

                const buJson = JSON.parse(fs.readFileSync(path.join(backUpPath, Consts.BACKUP_JSON_NAME)).toString())
                expect(buJson.buHash).toBeTruthy()
                delete buJson.buHash

                expect(buJson).toEqual(nativeModulesToPatch[nTP.name])
                
            }
        }
        it("Can create package backups", () => {
            const nativeModulesToPatch:INativeModuleToPatch = getMockNativeModulesToPatch({
                "mock-module-prebuilds": {
                    type: "prebuildfy",
                    existingPrebuilds: [
                        "win32-x64/electron.abi113.node",
                        "linux-x64/electron.abi113.node",
                    ],
                    prebuilds: [
                        "win32-x64/electron.abi116.node",
                        "linux-x64/electron.abi116.node"
                    ],
                    archAndPlatform: "win32-x64",
                    abiVersion: "electron.abi116.node"
                },
                "mock-module-built": {
                    type: "built",
                    prebuilds: [
                        "win32-x64/electron.abi116.node"
                    ],
                    archAndPlatform: "win32-x64",
                    abiVersion: "electron.abi116.node"
                },
                "mock-module-unbuilt": {
                    type: "unbuilt",
                    prebuilds: [
                        "win32-x64/electron.abi116.node",
                        "linux-x64/electron.abi116.node"
                    ],
                    archAndPlatform: "linux-x64",
                    abiVersion: "electron.abi116.node"
                }
    
            })
    
            new Patcher({
                forceRebuildOnNoBindings: true
            }).Patch(nativeModulesToPatch)

            CheckBackUpsCreated(nativeModulesToPatch)
        })


    })

    describe("It handles patching errors", () => {
        it("Throw error on fails", ()=>{
            const nativeModulesToPatch = getMockNativeModulesToPatch({
                "mock-module-unbuilt": {
                    type: "unbuilt",
                    prebuilds: [
                        "win32-x64/electron.abi116.node",
                        "linux-x64/electron.abi116.node"
                    ],
                    archAndPlatform: "linux-x64",
                    abiVersion: "electron.abi116.node"
                }
            })

            expect( () => new Patcher({
                shouldBackup: false,
                forceRebuildOnNoBindings: false
            }).Patch(nativeModulesToPatch)).toThrowError()
        })

        it("Skips when error and onPatchFail = skip", ()=>{
            const nativeModulesToPatch = getMockNativeModulesToPatch({
                "mock-module-unbuilt": {
                    type: "unbuilt",
                    prebuilds: [
                        "win32-x64/electron.abi116.node",
                        "linux-x64/electron.abi116.node"
                    ],
                    archAndPlatform: "linux-x64",
                    abiVersion: "electron.abi116.node"
                }
            })

            expect( () => new Patcher({
                shouldBackup: false,
                onPatchFail: 'skip',
                forceRebuildOnNoBindings: false
            }).Patch(nativeModulesToPatch)).not.toThrowError()

            expect(fs.existsSync(path.join(nativeModulesToPatch["mock-module-unbuilt"].path, "build"))).toBeFalsy()


        })
    })
})