import TestConsts from "./Consts"
import path from "path"
import fs from "fs"
import rimraf from "rimraf"

export class TestHelper{
    private static CheckTempPath(pathToCheck:string){
        if (!pathToCheck.includes(TestConsts.testTempDir)){
            throw new Error(`The specified path is not a sub directory of the temp path ${TestConsts.testTempDir}. Cannot process this.`)
        }
    }
    static GetTestTempDir(extraPath:string){
        const tempPath:string = path.isAbsolute(extraPath) ? extraPath : path.join(TestConsts.testTempDir, extraPath)
        TestHelper.CheckTempPath(tempPath)
        if (!fs.existsSync(tempPath)){
            fs.mkdirSync(tempPath, {recursive: true})
        }
        return tempPath
    }

    static CleanUpTempDir(extraPath:string){
        const tempPath:string = path.isAbsolute(extraPath) ? extraPath : path.join(TestConsts.testTempDir, extraPath)
        TestHelper.CheckTempPath(tempPath)
        if (fs.existsSync(tempPath)){
            rimraf.sync(tempPath);
        }
    }
}
