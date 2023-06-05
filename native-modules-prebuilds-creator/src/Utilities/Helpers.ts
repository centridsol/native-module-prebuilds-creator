import { spawnSync } from "child_process";
import fs from "fs"
import path from "path"
import sanitize from "sanitize-filename"

export class Helpers{
    static MakeNameSafe(name:string){
        return sanitize(name)
    }

    static SpwanFetchPackage(packageName:string, outputFolderPath:string){
        const result = spawnSync("npm", ["pack", packageName, "--pack-destination", outputFolderPath], {stdio: "pipe"})
        if (result.status != 0){
            throw new Error(`An error occured trying to fetched the package '${packageName}'. \n\nError message:- ${result.stderr.toString()}`)
        }
    }

    static InstallDependencies(packageName:string, packagePath:string){
        const result = spawnSync("yarn", ["install"], {stdio: "inherit", cwd: packagePath})
        if (result.status != 0){
            throw new Error(`An error occured trying to install dependencies for the package '${packageName}'. \n\nError message:- ${result.stderr.toString()}`)
        }
    }


    static GetCompressedPackage(outputFolder:string, packageName:string){
        const packagePath = fs.readdirSync(outputFolder).find((fName:string) => {
            const fullPath:string = path.join(outputFolder, fName)
            return fs.statSync(fullPath).isFile() && fName.concat(packageName.split("@")[0])
        })
        return !!packagePath ? path.join(outputFolder, packagePath) : null
    }
}