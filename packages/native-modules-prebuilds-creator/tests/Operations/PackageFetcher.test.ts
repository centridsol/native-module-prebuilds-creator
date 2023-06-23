import path from "path"
import fs from "fs"

import { PackageFetcher } from "../../src/Operations/PackageFetcher"
import { PackageItem } from "../../src/PackageItem"
import { TestMockObjectHelper } from "../Test.Utilities/Helper"
import { IPackageItemsToProcess } from "../../src/IPrebuildsCreator"
import { rimrafSync } from "rimraf"

describe("Package Fetcher tests", () => {

    const getPackageToProcess = (packageToProcess:any[]) => {
        const packagesToProcess:any = {}
        for (const packageDetails of packageToProcess){
            const packageDetailsCls = new PackageItem(packageDetails, TestMockObjectHelper.GetMockPrebuildifyProps())
            packagesToProcess[`${packageDetailsCls.packageName}@${packageDetailsCls.packageFetchVersion}`] = packageDetailsCls
        }
        return packagesToProcess
    }

    type PackageItemType = {
        downloadFolder:string
        tarballName:string
        tarballUrl:string
        packageName:string
        version:string
    }

    const assertPackageFetch = async (packageToFetch:{[packageName:string]: PackageItemType}) => {
        const packageItemToProcess:IPackageItemsToProcess = getPackageToProcess(Object.keys(packageToFetch))
        const packageFetcher:PackageFetcher = new PackageFetcher()
        await packageFetcher.Fetch(packageItemToProcess)

        for (const packageItem of Object.values(packageItemToProcess)){
            const expected = packageToFetch[`${packageItem.packageName}@${packageItem.packageFetchVersion}`] || packageToFetch[packageItem.packageName]
            // Zip downloaded
            const compressedNamePath:string = path.join(packageFetcher["tempDowloadFolder"], expected.downloadFolder, expected.tarballName)
    
            expect(fs.existsSync(compressedNamePath)).toBeTruthy()
            expect(fs.statSync(compressedNamePath).isFile()).toBeTruthy()

            // File extarcted
            expect(packageItem.sourcePath).toBeTruthy()
            expect(fs.statSync(packageItem.sourcePath).isDirectory()).toBeTruthy()

            const packageJson = JSON.parse(fs.readFileSync(path.join(packageItem.sourcePath, "package.json")).toString())
            expect(packageJson.name).toEqual(expected.packageName)
            expect(packageJson.version).toEqual(expected.version)

            // PackageItem
            expect(packageItem["fullPackageName"]).toEqual(`${expected.packageName}@${expected.version}`)
            expect(packageItem["packageVersion"]).toEqual(expected.version)
            expect(packageItem["tarballUrl"]).toEqual(expected.tarballUrl)
            expect(packageItem["tarballName"]).toEqual(expected.tarballName)
            expect(packageItem["packageJson"]).toEqual(packageJson)

        }
    }
    
    it("Can fetch and extract packages", async () =>{

        await assertPackageFetch({
            "npm-dummy-package@1.0.1": {
                downloadFolder: "npm-dummy-package@1.0.1",
                tarballName: "npm-dummy-package-1.0.1.tgz",
                tarballUrl: "https://registry.npmjs.org/npm-dummy-package/-/npm-dummy-package-1.0.1.tgz",
                packageName: "npm-dummy-package",
                version: "1.0.1"
            }
        })

    }, 60000)

    it("Can fetch and extract packages witout fixed version", async () => {

        await assertPackageFetch({
            "npm-dummy-package@^1.0.1": {
                downloadFolder: "npm-dummy-package@1.0.1",
                tarballName: "npm-dummy-package-1.0.1.tgz",
                tarballUrl: "https://registry.npmjs.org/npm-dummy-package/-/npm-dummy-package-1.0.1.tgz",
                packageName: "npm-dummy-package",
                version: "1.0.1"
            }
        })
    })

    it("Can fetch and extract packages witout version", async () => {

        await assertPackageFetch({
            "npm-dummy-package": {
                downloadFolder: "npm-dummy-package@1.0.1",
                tarballName: "npm-dummy-package-1.0.1.tgz",
                tarballUrl: "https://registry.npmjs.org/npm-dummy-package/-/npm-dummy-package-1.0.1.tgz",
                packageName: "npm-dummy-package",
                version: "1.0.1"
            }
        })
    })

    it("Can fetch muiltple packages", async () => {
        await assertPackageFetch({
            "npm-dummy-package@1.0.0": {
                downloadFolder: "npm-dummy-package@1.0.0",
                tarballName: "npm-dummy-package-1.0.0.tgz",
                tarballUrl: "https://registry.npmjs.org/npm-dummy-package/-/npm-dummy-package-1.0.0.tgz",
                packageName: "npm-dummy-package",
                version: "1.0.0"
            },
            "npm-dummy-package@1.0.1": {
                downloadFolder: "npm-dummy-package@1.0.1",
                tarballName: "npm-dummy-package-1.0.1.tgz",
                tarballUrl: "https://registry.npmjs.org/npm-dummy-package/-/npm-dummy-package-1.0.1.tgz",
                packageName: "npm-dummy-package",
                version: "1.0.1"
            }
        })
    }, 20000)

    it("Does not refetch if package already exists", async () =>{
        const packageFetcher:PackageFetcher = new PackageFetcher()

        rimrafSync(packageFetcher["tempDowloadFolder"])

        const packageToFetch:string = "npm-dummy-package@1.0.1"
        const downlaodedPackageName = "npm-dummy-package-1.0.1.tgz"

        const packageItemToProcess:IPackageItemsToProcess = getPackageToProcess([packageToFetch])

        await packageFetcher.Fetch(packageItemToProcess)
        const compressedNamePath:string = path.join(packageFetcher["tempDowloadFolder"], packageToFetch, downlaodedPackageName)

        const createdTime = `${fs.statSync(compressedNamePath).ctimeMs}_${fs.statSync(compressedNamePath).mtimeMs}`

        await packageFetcher.Fetch(packageItemToProcess)
        expect(createdTime).toEqual(`${fs.statSync(compressedNamePath).ctimeMs}_${fs.statSync(compressedNamePath).mtimeMs}`)


    })

    it("It can handle fetch failures", async () =>{
        try{
            await (new PackageFetcher()).Fetch(getPackageToProcess(["__centrid_unknown_module@1.0.1"]))
        }
        catch(err:any){
            expect(err.message.includes("EINVALIDPACKAGENAME")).toBeTruthy()
        }
        
    })
})