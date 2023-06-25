import TestConsts from "./Consts"
import path from "path"
import fs from "fs"
import rimraf from "rimraf"
import crypto from "crypto"

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

    static GenerateFolderHashSync(folderPath:string) {
        const hash = crypto.createHash('sha256');
      
        function processFile(filePath:string) {
          const fileData = fs.readFileSync(filePath);
          hash.update(fileData);
        }
      
        function processFolder(folderPath:string) {
          const files = fs.readdirSync(folderPath);
      
          files.forEach((file) => {
            const filePath = path.join(folderPath, file);
            const stats = fs.statSync(filePath);
      
            if (stats.isFile()) {
              processFile(filePath);
            } else if (stats.isDirectory()) {
              processFolder(filePath);
            } else {
              // Ignore other types of files (e.g., symbolic links)
            }
          });
        }
      
        processFolder(folderPath);
        return hash.digest('hex');
      }
      
}
