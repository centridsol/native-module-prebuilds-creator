import { PackageItem } from  "../../src/PackageItem"
import { PackageFetcher } from "../../src/Operations/PackageFetcher"
import { PreBuildifyBuilder, Prebuilder } from "../../src/Operations/PreBuildifyBuilder"
import { TestMockObjectHelper } from "../Test.Utilities/Helper"
import { AvailableMockObjects } from "../Test.Utilities/MockObjects/MockObjectRegister"
import path from "path"
import fsExtra from "fs-extra"
import { IPackageItem, IPackageItemsToProcess, IPreBuildifyOptions } from "../../src/IPrebuildsCreator"
import nodeAbi, { Target } from 'node-abi'
import { TestHelper } from "../../../testUtils/Helper"

describe("Prebuildify builder", () => {

    const getPackageItemFromNativeModule  = (nativeModuleId:string, additionalPackageJson:any={},  gloablPrebuildifyOpts:any=null, outFolder:any=null) => {
        const outPath = TestMockObjectHelper.CreateMockNativeModule(nativeModuleId, additionalPackageJson, outFolder)

        const packageJson:any =  JSON.parse(fsExtra.readFileSync(path.join(outPath, "package.json")).toString()) 
        
        return new PackageItem( {
            packageName: packageJson.name,
            version: packageJson.version
        }, TestMockObjectHelper.GetMockPrebuildifyProps(gloablPrebuildifyOpts)).SetSourcePath(outPath).SetPackageJson(packageJson)
    }

    const getSupportObjTargets = (nodeNodeAbi:string[], electronNodeAbi:string[]) => {
        return {
            supportedTargets: { 
                node: nodeAbi.supportedTargets.filter((t:Target) => {
                    return nodeNodeAbi.includes(t.abi) && t.runtime === "node"
                }), 
                electron: nodeAbi.supportedTargets.filter((t:Target) => {
                    return electronNodeAbi.includes(t.abi) && t.runtime === "electron"
                })
            },
            supportedAbiVersions: [...new Set([...nodeNodeAbi, ...electronNodeAbi])].sort((a:string, b:string) => parseInt(a) - parseInt(b))
        }
    }

    const assertBuilt = (packageItem:IPackageItem, packageId:string, targetInfo:string[]) => {
  
        expect(packageItem.prebuildPaths.includes("prebuilds")).toBeTruthy()
        expect(fsExtra.existsSync(packageItem.prebuildPaths)).toBeTruthy()

        const archPrebuiltPath:string = path.join(packageItem.prebuildPaths, 
            `${packageItem.mergedPrebuildifyOptions.platform}-${packageItem.mergedPrebuildifyOptions.arch}`)

        expect(fsExtra.existsSync(archPrebuiltPath)).toBeTruthy()
        
        for(const tI of targetInfo){
            const nodeAddOnePath = path.join(archPrebuiltPath, `${tI}.node`)
            expect(fsExtra.existsSync(nodeAddOnePath)).toBeTruthy()
            expect(require(nodeAddOnePath).GetName()).toEqual(packageId)
        }
    }

    beforeEach(()=>{
        TestHelper.CleanUpTempDir("")
    })

    describe("Prebuilder tests", ()=>{
        const getPrebuilderInstance = (nativeModuleId:string, additionalPackageJson:any={},  gloablPrebuildifyOpts:any=null) => {
            return new Prebuilder(getPackageItemFromNativeModule(nativeModuleId, additionalPackageJson, gloablPrebuildifyOpts))
        }

        it("Can check if native", () => {
            let prebuilder:Prebuilder = getPrebuilderInstance(AvailableMockObjects.SimpleNative, {
                engines: {
                    node: ">=16 < 19"
                }
            })

            expect(prebuilder.IsNativeModule()).toBeFalsy()

            prebuilder = getPrebuilderInstance(AvailableMockObjects.SimpleNative, {
                engines: {
                    node: ">=16 < 19"
                },
                dependencies: {
                    "bindings": "^1.5.0",
                }
            })

            expect(prebuilder.IsNativeModule()).toBeTruthy()

        })

        describe("Can get all supoorted targets", () => {
            it("When node engine specified", () => {
                const prebuilder:Prebuilder = getPrebuilderInstance(AvailableMockObjects.SimpleNative, {
                    engines: {
                        node: ">=16 < 19"
                    }
                })
                prebuilder.SetSupportedTargetDetails()
                expect(prebuilder["packageToProcess"].supportedTargetObj).toEqual({
                    runtimeRestrictions: { node: '>=16 < 19', electron: null },
                    ...getSupportObjTargets([ '93', '102', '108' ], [])
                })
            })

            it("When electron engine specified", () => {
                const prebuilder:Prebuilder = getPrebuilderInstance(AvailableMockObjects.SimpleNative, {
                    engines: {
                        electron: ">=14 < 22"
                    }
                })
                prebuilder.SetSupportedTargetDetails()
                expect(prebuilder["packageToProcess"].supportedTargetObj).toEqual({
                    runtimeRestrictions: { node: null, electron: '>=14 < 22', },
                    ...getSupportObjTargets( [] , [ '97' ])
                })
            })

            it("When no engine restrictions specified", () => {
                const prebuilder:Prebuilder = getPrebuilderInstance(AvailableMockObjects.SimpleNative)
                prebuilder.SetSupportedTargetDetails()
                expect(prebuilder["packageToProcess"].supportedTargetObj).toEqual({
                    runtimeRestrictions: { node: null, electron: null },
                    ...getSupportObjTargets([
                        '47',  '48',  '51',  '57',
                        '59',  '64',  '67',  '72',
                        '79',  '83',  '88',  '93',
                        '102', '108', '111', '115'
                      ], [
                        '47',  '48',  '49',  '50',  '51',
                        '53',  '54',  '57',  '57',  '64',
                        '64',  '69',  '70',  '73',  '75',
                        '76',  '76',  '80',  '82',  '82',
                        '85',  '87',  '89',  '89',  '89',
                        '97',  '98',  '99',  '101', '103',
                        '106', '107', '109', '110', '113',
                        '114', '116'
                      ])
                })
            })

            it("Return correct support for electron and node engine specified", () => {
                const prebuilder:Prebuilder = getPrebuilderInstance(AvailableMockObjects.SimpleNative, {
                    engines: {
                        electron: ">=14 < 22",
                        node: ">=16 < 19"
                    }
                })
                prebuilder.SetSupportedTargetDetails()
                expect(prebuilder["packageToProcess"].supportedTargetObj).toEqual({
                    runtimeRestrictions: { node:  ">=16 < 19", electron: '>=14 < 22', },
                    ...getSupportObjTargets( ['93', '102', '108'] , [ '97' ])
                })
            })

            it("Return correct abi version when include prerelease specified", () => {
                const prebuilder:Prebuilder = getPrebuilderInstance(AvailableMockObjects.SimpleNative, {
                    engines: {
                        electron: ">=16 < 22"
                    }
                }, { includePreReleaseTargets : true})
                prebuilder.SetSupportedTargetDetails()
                expect(prebuilder["packageToProcess"].supportedTargetObj).toEqual({
                    runtimeRestrictions: { node: null, electron: '>=16 < 22', },
                    ...getSupportObjTargets( [] , [ '99', '101', '103', '106', '107', '109'])
                })
            })
        })

        describe("Can validate and update specifed targets", () =>{
            it("Errors out when onUnsupportedTargets is 'error', and target not supported", () =>{
                const prebuilder:Prebuilder = getPrebuilderInstance(AvailableMockObjects.SimpleNative, {
                    engines: {
                        node: ">=16 < 21"
                    }
                }, {
                     onUnsupportedTargets: 'error', 
                     targets: [ 
                        { 
                            runtime: "node",
                            target: "14.0.0"
                        },
                        {
                            abiVersion: "108"
                        }
                    ]})
            
                prebuilder.SetSupportedTargetDetails()
                expect(() => prebuilder.ValidateAndSetPackageTargets()).toThrowError()
            })

            it("Remove specified target when onUnsupportedTargets is 'skip', and target not supported", () => {
                const prebuilder:Prebuilder = getPrebuilderInstance(AvailableMockObjects.SimpleNative, {
                    engines: {
                        node: ">=16 < 21"
                    }
                }, {
                     onUnsupportedTargets: 'skip', 
                     includePreReleaseTargets : true, 
                     targets: [ 
                        { 
                            runtime: "node",
                            target: "14.0.0"
                        },
                        {
                            abiVersion: "108"
                        }
                    ]})

                prebuilder.SetSupportedTargetDetails()
                prebuilder.ValidateAndSetPackageTargets()

                expect(prebuilder["packageToProcess"].mergedPrebuildifyOptions.targets).toEqual([
                    {"abi": "108", "lts": true, "runtime": "node", "target": "18.0.0"}
                ])
            })

            it("Remove specified target when onUnsupportedTargets is 'force', and target not supported", () => {
                const prebuilder:Prebuilder = getPrebuilderInstance(AvailableMockObjects.SimpleNative, {
                    engines: {
                        node: ">=16 < 21"
                    }
                }, {
                     onUnsupportedTargets: 'force', 
                     includePreReleaseTargets : true, 
                     targets: [ 
                        { 
                            runtime: "node",
                            target: "14.0.0"
                        },
                        {
                            abiVersion: "108"
                        }
                    ]})

                prebuilder.SetSupportedTargetDetails()
                prebuilder.ValidateAndSetPackageTargets()

                expect(prebuilder["packageToProcess"].mergedPrebuildifyOptions.targets).toEqual([
                    {"abi": "83", "lts": false, "runtime": "node", "target": "14.0.0"},
                    {"abi": "108", "lts": true, "runtime": "node", "target": "18.0.0"}
                ])
            })


            it("Converts all targets (including abi's) into target objects", () => {
                const prebuilder:Prebuilder = getPrebuilderInstance(AvailableMockObjects.SimpleNative, {
                    engines: {
                        node: ">=16 < 21"
                    }
                }, { includePreReleaseTargets : true, 
                     targets: [ 
                        { 
                            runtime: "node",
                            target: "16.0.0"
                        },
                        { 
                            runtime: "node",
                            target: "18.0.0"
                        },
                        {
                            abiVersion: "108"
                        }
                    ]})

                prebuilder.SetSupportedTargetDetails()
                prebuilder.ValidateAndSetPackageTargets()

                expect(prebuilder["packageToProcess"].mergedPrebuildifyOptions.targets).toEqual([
                    {"abi": "93", "lts": false, "runtime": "node", "target": "16.0.0"}, 
                    {"abi": "108", "lts": true, "runtime": "node", "target": "18.0.0"}
                ])
            })
        })
    })

    describe("Can build native modules using prebuildify", () => {
       
        it("Can do a single tagert build", async () => {
            const napi_target =  nodeAbi.supportedTargets.slice(-1)[0]
            const packageItem = getPackageItemFromNativeModule(AvailableMockObjects.SimpleNative, 
                {},  
                {targets: [
                    napi_target
                ]}, 
                AvailableMockObjects.SimpleNative)

            await new PreBuildifyBuilder({}).Prebuildifier(packageItem)
            assertBuilt(packageItem, AvailableMockObjects.SimpleNative, [`${napi_target?.runtime}.abi${napi_target?.abi}`])
        }, 20000)


        it ("Can do a muiltple tagert build", async () => {
            const napi_target =  nodeAbi.supportedTargets.slice(-10)
            const packageItem = getPackageItemFromNativeModule(AvailableMockObjects.SimpleNative, 
                {},  
                {
                    targets: napi_target
                }, 
                AvailableMockObjects.SimpleNative)

            await new PreBuildifyBuilder({}).Prebuildifier(packageItem)
            assertBuilt(packageItem, AvailableMockObjects.SimpleNative, napi_target.map((t:Target) => `${t.runtime}.abi${t.abi}`))
        }, 60000)


        it ("Can handle build errors", async () => {
            const napi_target =  nodeAbi.supportedTargets.slice(-1)[0]
            const packageItem = getPackageItemFromNativeModule(AvailableMockObjects.BrokenNative, 
                {},  
                {targets: [
                    napi_target
                ]}, 
                AvailableMockObjects.BrokenNative)

                try{
                    await new PreBuildifyBuilder({}).Prebuildifier(packageItem)
                    expect(true).toBeFalsy()
                }
                catch(err:any){
                    expect(err.message.includes("node-gyp exited with 1")).toBeTruthy()
                    expect(true).toBeTruthy()
                }
                
        })
    })

    describe("Full tests", () => {
        const sampleTargets:any[] = [...nodeAbi.supportedTargets.filter((t:Target) => t.runtime === "node").slice(-2),
                                    ...nodeAbi.supportedTargets.filter((t:Target) => t.runtime === "electron").slice(-2)]
        const createSampleNativeModule = (nativeModules: {id: string, prebuildifyOpt:IPreBuildifyOptions}[]) => {

            let packageItems:IPackageItemsToProcess = {}
            for (const nativeModule of nativeModules){
                packageItems[nativeModule.id] = getPackageItemFromNativeModule(AvailableMockObjects.SimpleNative, 
                    {
                        dependencies: {
                            "bindings": "^1.5.0",
                        }
                    },  
                    { 
                        targets: sampleTargets, 
                        ...nativeModule.prebuildifyOpt
                    }, 
                    nativeModule.id)
            }
            return packageItems
        }

        it("Can build multiple native packages", async () => {
            const nativeModules:any = [...Array(7).keys()].map((n:any, index:number) => {
                return  {id: `SimpleModule${index+1}`, prebuildifyOpt:{}}
            })

            let packageItems:IPackageItemsToProcess = createSampleNativeModule(nativeModules)
            await new PreBuildifyBuilder(packageItems).BuildAll()

            const sampleTargetAsStrings:string[] = sampleTargets.map((t:Target) => `${t.runtime}.abi${t.abi}`)

            for (const [id, packageItem] of Object.entries(packageItems)){
                assertBuilt(packageItem, id, sampleTargetAsStrings)
            }
           
        }, 60000)

        it("Can build multiple native packagaes with different prebuildify settings", async () => {
            const nativeModules:any = [
                {id: "NativeModule1", prebuildifyOpt:{
                    targets: [sampleTargets[0], sampleTargets[2]]
                }},
                {id: "NativeModule2", prebuildifyOpt:{
                    targets: [sampleTargets[0]] 
                }},
            ];

            let packageItems:IPackageItemsToProcess = createSampleNativeModule(nativeModules)
            await new PreBuildifyBuilder(packageItems).BuildAll()
            
            let i = 0
            for (const [id, packageItem] of Object.entries(packageItems)){

                const prebuildFolder:string = path.join(packageItem.prebuildPaths, 
                                                        `${packageItem.mergedPrebuildifyOptions.platform}-${packageItem.mergedPrebuildifyOptions.arch}`)

                const expectedTargets = nativeModules[i].prebuildifyOpt.targets.map((t:Target) => `${t.runtime}.abi${t.abi}`)
                expect(fsExtra.readdirSync(prebuildFolder).sort()).toEqual(expectedTargets.map((f:string) => `${f}.node`).sort())
                assertBuilt(packageItem, id, expectedTargets)
                i++
            }
            
        })
    })
    
})