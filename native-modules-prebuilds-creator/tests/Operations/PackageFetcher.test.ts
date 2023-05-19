import path from "path"
import fs from "fs"
import os from "os"

import { PackageFetcher } from "../../src/Operations/PackageFetcher"
import { rimrafSync } from "rimraf"
import { Consts } from "../../src/Utilities/Consts"

describe("Package Fetcher tests", () => {
    const assertPackageFetch = async (packageToFetch:string, downlaodedPackageName:string) => {
        const packagePaths:any = await (new PackageFetcher()).Fetch([packageToFetch])

        expect(packageToFetch in packagePaths).toBeTruthy()
        expect(fs.statSync(packagePaths[packageToFetch]).isDirectory()).toBeTruthy()

        const compressedNamePath:string = path.join(path.dirname(packagePaths[packageToFetch]), downlaodedPackageName)

        expect(fs.existsSync(compressedNamePath)).toBeTruthy()
        expect(fs.statSync(compressedNamePath).isFile()).toBeTruthy()
    }
    it("Can fetch and extract packages", async () =>{
        const packageToFetch:string = "npm-dummy-package@1.0.1"
        const downlaodedPackageName = "npm-dummy-package-1.0.1.tgz"

        await assertPackageFetch(packageToFetch, downlaodedPackageName)

    })

    it("Can fetch and extract packages witout fixed version", async () => {
        const packageToFetch:string = "npm-dummy-package@^1.0.1"
        const downlaodedPackageName = "npm-dummy-package-1.0.1.tgz"

        await assertPackageFetch(packageToFetch, downlaodedPackageName)
    })

    it("Does not refetch if package already exists", async () =>{
        rimrafSync(path.join(os.tmpdir(), Consts.TEMP_DIR_NAME))

        const packageToFetch:string = "npm-dummy-package@1.0.1"
        const downlaodedPackageName = "npm-dummy-package-1.0.1.tgz"

        const packagePaths:any = await (new PackageFetcher()).Fetch([packageToFetch])
        const compressedNamePath:string = path.join(path.dirname(packagePaths[packageToFetch]), downlaodedPackageName)

        const createdTime = `${fs.statSync(compressedNamePath).ctimeMs}_${fs.statSync(compressedNamePath).mtimeMs}`

        await (new PackageFetcher()).Fetch([packageToFetch])
        expect(createdTime).toEqual(`${fs.statSync(compressedNamePath).ctimeMs}_${fs.statSync(compressedNamePath).mtimeMs}`)


    })

    it("It can handle fetch failures", async () =>{
        try{
            await (new PackageFetcher()).Fetch(["__centrid_unknown_module@1.0.1"])
        }
        catch(err:any){
            expect(err.message.includes("EINVALIDPACKAGENAME")).toBeTruthy()
        }
        
    })
})