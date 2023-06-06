import { PackageItem } from  "../../src/PackageItem"
import { PackageFetcher } from "../../src/Operations/PackageFetcher"
import { PreBuildifyBuilder, Prebuilder } from "../../src/Operations/PreBuildifyBuilder"
import { TestMockObjectHelper } from "../Test.Utilities/Helper"
import { AvailableMockObjects } from "../Test.Utilities/MockObjects/MockObjectRegister"
import path from "path"
import fsExtra from "fs-extra"
import { IPackageItem } from "../../src/IPrebuildsCreator"

describe("Prebuildify builder", () => {

    const getPackageItemFromNativeModule  = (nativeModuleId:string, additionalPackageJson:any={},  gloablPrebuildifyOpts:any=null) => {
        const outPath = TestMockObjectHelper.CreateMockNativeModule(nativeModuleId, additionalPackageJson)

        const packageJson:any =  JSON.parse(fsExtra.readFileSync(path.join(outPath, "package.json")).toString()) 
        
        return new PackageItem( {
            packageName: packageJson.name,
            version: packageJson.version
        }, gloablPrebuildifyOpts ? gloablPrebuildifyOpts : TestMockObjectHelper.GetMockPrebuildifyProps()).SetPackageJson(packageJson)
    }

    describe("Prebuilder tests", ()=>{
        const getPrebuilderInstance = (nativeModuleId:string, additionalPackageJson:any={},  gloablPrebuildifyOpts:any=null) => {
            return new Prebuilder(getPackageItemFromNativeModule(nativeModuleId, additionalPackageJson, gloablPrebuildifyOpts))
        }

        beforeAll(() => {
            
        })
        it("Can check if native", () => {
            
        })

        describe("Can get all supoorted targets", () => {
            it("When node engine specified", () => {

            })

            it("When electron engine specified", () => {
                const prebuilder:Prebuilder = getPrebuilderInstance(AvailableMockObjects.SimpleNative, {
                    engines: {
                        node: ">=16 < 19"
                    }
                })
                prebuilder.SetSupportedTargetDetails()
                console.log(prebuilder["packageToProcess"].supportedTargetObj)
            })

            it("When no engine restrictions specified", () => {
                // const prebuilder:Prebuilder = getPrebuilderInstance(AvailableMockObjects.SimpleNative)
                // prebuilder.SetSupportedTargetDetails()
                // console.log(prebuilder["packageToProcess"].supportedTargetObj)
            })

            it("unions", () => {})
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