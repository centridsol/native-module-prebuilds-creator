import { TestHelper } from "../../../testUtils/Helper"
import { patchNativeModules } from "../../src/Operations/prebuild-patcher"
import path from "path"
import fs from "fs"
import { TestMockObjectHelper } from "../Test.Utilities/Helper"
import { AvailableMockObjects } from "../Test.Utilities/MockObjects/MockObjectRegister"
import { IPackageItemsToProcess } from "../../src/IPrebuildsCreator"
import { PreBuildifyBuilder } from "../../src/Operations/PreBuildifyBuilder"
import { PreBuildsCopier } from "../../src/Operations/PreBuildsCopier"
import nodeAbi, { Target } from 'node-abi'
import os from 'os'

describe("Pacther Tests", () => {

    let sampleTargets:any[]

    beforeAll( () => {
        sampleTargets = [...nodeAbi.supportedTargets.filter((t:Target) => t.runtime === "node").slice(-1),
                         ...nodeAbi.supportedTargets.filter((t:Target) => t.runtime === "electron").slice(-1)]
    })

    const getTempProjectDir = (nodeModuleToMock:any[]= []) => {
        const mockNativeDir:string = 'tempPatchNative'
        TestHelper.CleanUpTempDir(mockNativeDir)
        const tempDir =  TestHelper.GetTestTempDir(mockNativeDir)
        getMockNodeModule(nodeModuleToMock, tempDir)
        return tempDir
    }

    const getMockPatchOutputDir = () => {
        const mockNativeDir:string = 'nativePackagerOutput'
        TestHelper.CleanUpTempDir(mockNativeDir)
        return  TestHelper.GetTestTempDir(mockNativeDir)
    }


    const getMockNodeModule = (nodeModuleToMock:any[]= [], projectFolder:string) => {
        const nodeModulesFolder = path.join(projectFolder, "node_modules")
        if (!fs.existsSync(nodeModulesFolder)){
            fs.mkdirSync(nodeModulesFolder)
        }

        for (const mockModule of nodeModuleToMock){
            if (!mockModule.addAsMock || mockModule.addAsMock){
                
                const mockModulePath = path.join(nodeModulesFolder, mockModule.name)
                if (!fs.existsSync(mockModulePath)){
                    fs.mkdirSync(mockModulePath)
                }

                fs.writeFileSync(path.join(mockModulePath, "package.json"), JSON.stringify({name: mockModule.name, version : mockModule.version || "1.0.0"}, null, 4))
            }
        }
    }

    describe("Validates configure correctly", () => {
        it("Errors wehn node_modules folder is not found", () => {
            const randomDir = TestHelper.GetTestTempDir("randomDir")
            expect(() => patchNativeModules([], {
                projectDir: randomDir
            } as any)).toThrowError(`Could not find the node_modules folder for the project path '${randomDir}'`)
        })

        it("Erros out when node-gyp-build not installed", () => {
            const mockProjectPath = getTempProjectDir([])
            expect(() => patchNativeModules([], {
                projectDir: mockProjectPath
            } as any)).toThrowError(`The pactcher script requires node-gyp-build to be installed. Please install it with 'npm install --save node-gyp-build' (or yarn)`)

        })
    })

    const getPatcher = async (mockNativeModule:any[]=[]) => {
        const patchedDir:string = getMockPatchOutputDir()

        let packageItems:IPackageItemsToProcess = {}
        for (const nativeModule of mockNativeModule){
            packageItems[nativeModule.id] = TestMockObjectHelper.GetPackageItemFromNativeModule(AvailableMockObjects.SimpleNative, 
                {
                    name: nativeModule.id,
                    dependencies: {
                        "bindings": "^1.5.0",
                    }
                },  
                { 
                    targets: sampleTargets
                }, 
                nativeModule.id)
        }
        
        await new PreBuildifyBuilder(packageItems).BuildAll()
        new PreBuildsCopier(packageItems).Copy(patchedDir)
        return require( path.join(patchedDir, "prebuild-patcher.js"))
    }

    describe("Validates and get installed Package info", () => {

        let patcher:any = null

        beforeAll(async ()=>{
             patcher = await getPatcher([{id: "patcher-native1"}])
        })
        

        it("It throws error when try to patch non-existent package", ()=>{
            expect(() => patcher.patchNativeModules([{name: 'unknown', version: "1.0.0"}], {
                projectDir: getTempProjectDir([{name: 'node-gyp-build'}]),
            })).toThrowError(`Cannot patch the package 'unknown' as it does not exist in the node_modules folder`)
        })
        
        describe("It handle package version mismatches correctly", () => {
            it("Errors when onVersionMismatch not specified", () => {
                expect(() => patcher.patchNativeModules([{name: 'altVersion', version: "2.0.0"}], {
                    projectDir: getTempProjectDir([{name: 'node-gyp-build'}, {name: 'altVersion'}]),
                })).toThrowError(`Could not patch the package 'altVersion'. Installed version '1.0.0'. Trying to patch version '2.0.0'`)
            })

            it("Errors when onVersionMismatch = 'error", () => {
                expect(() => patcher.patchNativeModules([{name: 'altVersion', version: "2.0.0"}], {
                    projectDir: getTempProjectDir([{name: 'node-gyp-build'}, {name: 'altVersion'}]),
                    onVersionMismatch: 'error'
                })).toThrowError(`Could not patch the package 'altVersion'. Installed version '1.0.0'. Trying to patch version '2.0.0'`)
            })

            it("Skips patching when onVersionMismatch='skip'", () => {
                const projectDir:string  = getTempProjectDir([{name: 'node-gyp-build'}, {name: 'altVersion'}])
                patcher.patchNativeModules([{name: 'altVersion', version: "2.0.0"}], {
                    projectDir,
                    onVersionMismatch: 'skip'
                })

                expect(JSON.parse(fs.readFileSync(path.join(projectDir, "node_modules", "altVersion", "package.json")).toString()).install).toBeFalsy()
            })
        })
    })

    describe("Validate prebuild package details", () => {
        let patcher:any = null

        beforeAll(async ()=>{
             patcher = await getPatcher([{id: "patcher-native1"}])
        })

        it("Errors out when no prebuild package is available", () =>{
            expect(() => patcher.patchNativeModules([{name: 'altVersion', version: "1.0.0"}], {
                projectDir: getTempProjectDir([{name: 'node-gyp-build'}, {name: 'altVersion'}]),
            })).toThrowError(`No prebuilds found for the package altVersion`)
        })

        it("Errors out when not corresponding version found", () =>{
            expect(() => patcher.patchNativeModules([{name: 'patcher-native1', version: "2.0.0"}], {
                projectDir: getTempProjectDir([{name: 'node-gyp-build'}, {name: 'patcher-native1', version: "2.0.0"}]),
            })).toThrowError(`Could not find prebuilds versions for the package 'patcher-native1@2.0.0'. Available prebuilt versions are listed below:`)
        })
    })

    const assertPatchedCorrectly = (projectDir:string, packagesToCheck:string[]) => {
        const assertDirExists = (dirPath:string) =>{
            expect(fs.existsSync(dirPath)).toBeTruthy()
            expect(fs.statSync(dirPath).isDirectory()).toBeTruthy()
        }

        for (const packageToCheck of packagesToCheck){
            const prebuildsFolder = path.join(projectDir, "node_modules", packageToCheck, "prebuilds")
            assertDirExists(prebuildsFolder)

            const platformPath:string = path.join(prebuildsFolder, `${os.platform()}-${os.arch()}`)
            assertDirExists(platformPath)

            for (const napi_target of sampleTargets){
                const compiledNodePath:string =  path.join(platformPath, `${napi_target?.runtime}.abi${napi_target?.abi}.node`)
                expect(fs.existsSync(compiledNodePath)).toBeTruthy()
                expect(require(compiledNodePath).GetName()).toEqual(packageToCheck)
            }
        }

    }

    describe("Patches packages correctly", () => {

        it("Can patch single package correctly",  async () => {
            const patcher = await getPatcher([{id: "patcher-native2"}])
            const projectDir = getTempProjectDir([{name: 'node-gyp-build'}, {name: 'patcher-native2'}])
            patcher.patchNativeModules([{name: 'patcher-native2', version: "1.0.0"}], {
                projectDir
            })
            assertPatchedCorrectly(projectDir, ["patcher-native2"])
        })

        it("Can patch multiple package correctly",  async () => {
            const patcher = await getPatcher([{id: "patcher-native3"}, {id: "patcher-native4"}, {id: "patcher-native5"}])
            const projectDir = getTempProjectDir([{name: 'node-gyp-build'}, {name: 'patcher-native3'}, {name: 'patcher-native4'}, {name: 'patcher-native5'}])
            patcher.patchNativeModules([{name: 'patcher-native3', version: "1.0.0"},
                                        {name: 'patcher-native4', version: "1.0.0"},
                                        {name: 'patcher-native5', version: "1.0.0"}], {
                projectDir
            })
            assertPatchedCorrectly(projectDir, ["patcher-native3", "patcher-native4", "patcher-native5"])
        }, 20000)
    })
})