import { PackageItem } from  "../../src/PackageItem"
import { PackageFetcher } from "../../src/Operations/PackageFetcher"
import { PreBuildifyBuilder, Prebuilder } from "../../src/Operations/PreBuildifyBuilder"
import { TestMockObjectHelper } from "../Test.Utilities/Helper"
import { AvailableMockObjects } from "../Test.Utilities/MockObjects/MockObjectRegister"
import path from "path"
import fsExtra from "fs-extra"
import { IPackageItem } from "../../src/IPrebuildsCreator"
import nodeAbi, { Target } from 'node-abi'

describe("Prebuildify builder", () => {

    const getPackageItemFromNativeModule  = (nativeModuleId:string, additionalPackageJson:any={},  gloablPrebuildifyOpts:any=null) => {
        const outPath = TestMockObjectHelper.CreateMockNativeModule(nativeModuleId, additionalPackageJson)

        const packageJson:any =  JSON.parse(fsExtra.readFileSync(path.join(outPath, "package.json")).toString()) 
        
        return new PackageItem( {
            packageName: packageJson.name,
            version: packageJson.version
        }, TestMockObjectHelper.GetMockPrebuildifyProps(gloablPrebuildifyOpts)).SetPackageJson(packageJson)
    }

    const getSupportObjTargets = (nodeNodeAbi:string[], electronNodeAbi:string[]) => {
        console.log(nodeAbi.supportedTargets.filter((t:Target) => {
            return t.runtime === "electron"
        }))
        console.log([...new Set([...nodeNodeAbi, ...electronNodeAbi])].sort((a:string, b:string) => parseInt(a) - parseInt(b)))

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
            it("Errors out when strictTargets is true, and target not supported", () =>{

            })

            it("Remove specified target when strictTarget is false, and target not supported", () => {

            })

            it("Converts all targets (including abi's) into target objects", () => {

            })
        })
    })
    // it("Can build native modules", async () => {
    //     //let packagePaths:any = await (new PackageFetcher()).Fetch(["drivelist"])

    //     let packagePaths:any = {
    //         ["drivelist"]: {
    //             packagePath: "/tmp/nm-prebuilds-creator/drivelist/package/",
    //             nativeBuildPaths: null
    //         }
    //     }

    //     packagePaths = await (new PreBuildifyBuilder(packagePaths)).BuildAll({
    //         arch: "x64",
    //         platform: "linux",
    //         // @ts-ignore
    //         //napi: true,
    //         targets: ["node@20.0.0", "node@16.0.0", "node@14.0.0"]
    //     })

        
    //}, 
   // 60000)
})