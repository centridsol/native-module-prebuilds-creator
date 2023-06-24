import { TestHelper } from "../../../../testUtils/Helper"
import { IPackageItem, IPackageItemsToProcess } from "../../src/IPrebuildsCreator"
import { PreBuildifyBuilder } from "../../src/Operations/PreBuildifyBuilder"
import { PreBuildsCopier } from "../../src/Operations/PreBuildsCopier"
import { TestMockObjectHelper } from "../Test.Utilities/Helper"
import { AvailableMockObjects } from "../Test.Utilities/MockObjects/MockObjectRegister"
import nodeAbi, { Target } from 'node-abi'
import fs from "fs"
import path from "path"
import os from "os"
import webpack from "webpack"

describe("Prebuilds copier tests", () => {

    const getTempOut = () => {
        const mockNativeDir:string = 'tempPrebuildOutput'
        TestHelper.CleanUpTempDir(mockNativeDir)
        return TestHelper.GetTestTempDir(mockNativeDir)
    }

    let sampleTargets:any[]

    beforeAll( async () => {
        sampleTargets = [...nodeAbi.supportedTargets.filter((t:Target) => t.runtime === "node").slice(-1),
                         ...nodeAbi.supportedTargets.filter((t:Target) => t.runtime === "electron").slice(-1)]

        await new Promise((resolve:any, reject:any)=> {
            webpack(require(path.join(__dirname, "../../prebuilds-patcher.webpack.config.js"))).run((err:any)=>{
                if(err){
                    reject(err)
                }else{
                    resolve()
                }
            
            })
        })
    }, 20000)

    const getPackagesToCopy = async (number:number) => {

        

        let packagesToCopy:IPackageItemsToProcess = [...Array(number).keys()].map((n:any, index:number) => {
            return  {id: `simple-native${index+1}`, prebuildifyOpt:{}}
        }).reduce((packageItems:IPackageItemsToProcess, nativeModule: {id: string, prebuildifyOpt:any}) => {

            packageItems[nativeModule.id] = TestMockObjectHelper.GetPackageItemFromNativeModule(AvailableMockObjects.SimpleNative, 
                {
                    name: nativeModule.id,
                    dependencies: {
                        "bindings": "^1.5.0",
                    }
                },  
                { 
                    // @ts-ignore
                    targets: sampleTargets, 
                    ...nativeModule.prebuildifyOpt
                }, 
                nativeModule.id)

            return packageItems
        }, {} )

        await (new PreBuildifyBuilder(packagesToCopy)).BuildAll()
        return packagesToCopy
    }


    const assertFolderCopiedCorrectly = (packagesToCopy:IPackageItemsToProcess, output:string) => {
        const assertDirExists = (dirPath:string) =>{
            expect(fs.existsSync(dirPath)).toBeTruthy()
            expect(fs.statSync(dirPath).isDirectory()).toBeTruthy()
        }
        const prebuildsFolder = path.join(output, "prebuilds")
        for (const packageItem of Object.values(packagesToCopy)){
            const packagePrebuildFolder = path.join(prebuildsFolder, packageItem.fullPackageName)
            assertDirExists(packagePrebuildFolder)

            const platformPath:string = path.join(packagePrebuildFolder, `${os.platform()}-${os.arch()}`)
            assertDirExists(platformPath)

            for (const napi_target of sampleTargets){
                const compiledNodePath:string =  path.join(platformPath, `${napi_target?.runtime}.abi${napi_target?.abi}.node`)
                expect(fs.existsSync(compiledNodePath)).toBeTruthy()
                expect(require(compiledNodePath).GetName()).toEqual(packageItem.packageJson.name)
            }
        }
    }

    const assertManifestCreatedCorrectly = (packagesToCopy:IPackageItemsToProcess, output:string)=>{
        const prebuildManifestFile:string = path.join(output, "prebuild-manifest.json")
        expect(fs.existsSync(prebuildManifestFile)).toBeTruthy()

        const patcherFile:string = path.join(output, "prebuild-patcher.js")
        expect(fs.existsSync(patcherFile)).toBeTruthy()

        const generaedManifestJson = JSON.parse(fs.readFileSync(prebuildManifestFile).toString())
        expect(generaedManifestJson).toEqual(Object.values(packagesToCopy).reduce<any>((pv:any, cv:IPackageItem ) => {
            pv[cv.packageName] = {
                [cv.packageJson.version] : {
                    prebuildPath: `prebuilds/${cv.fullPackageName}`
                }
            }
            return pv
        }, {}))
    }
    
    
    describe("Main operations tests", () => {

        it("Copiers the prebuild folders correctly", async () => {
            const tempOut:string = getTempOut()
            const packagesToCopy:IPackageItemsToProcess = await getPackagesToCopy(2)
            new PreBuildsCopier(packagesToCopy).Copy(tempOut)

            assertFolderCopiedCorrectly(packagesToCopy, tempOut)
            assertManifestCreatedCorrectly(packagesToCopy, tempOut)
        }, 20000)



    })
    
})