import { spawnSync } from "child_process";
import fs from "fs"
import path from "path"
import sanitize from "sanitize-filename"
import { IFetchedPackageDetails, IPackageItem } from "../IPrebuildsCreator";

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
        const result = spawnSync("yarn", ["install", "--ignore-scripts"], {stdio: "inherit", cwd: packagePath})
        if (result.status != 0){
            throw new Error(`An error occured trying to install dependencies for the package '${packageName}'. \n\nError message:- ${result.stderr.toString()}`)
        }
    }


    static GetCompressedPackage(outputFolder:string, packageName:string){
        const packagePath = fs.readdirSync(outputFolder).find((fName:string) => {
            const fullPath:string = path.join(outputFolder, fName)
            return fs.statSync(fullPath).isFile() && fName.includes(packageName.split("@")[0])
        })
        return !!packagePath ? path.join(outputFolder, packagePath) : null
    }

    static GetPackageDetails(packageItem:IPackageItem): IFetchedPackageDetails{

        const throwError = (err:any) => {
            throw new Error(`An error occured trying to fetched the package '${fetchPackageName}'. \n\nError message:- ${err}`)
        }

        const fetchPackageName:string = packageItem.packageFetchVersion ? `${packageItem.packageName}@${packageItem.packageFetchVersion}` : packageItem.packageName

        const result = spawnSync("npm", ["view", fetchPackageName, "--json", "_id", "dist.tarball", "version"], {stdio: "pipe"})
        if (result.status != 0){
            throwError(new Error(result.stderr.toString()))
        }
        try{
            const packageDetails:any = JSON.parse(result.stdout.toString())
            for (const field of ["_id", "dist.tarball", "version"]){
                if (!(field in packageDetails)){
                    throwError(new Error(`Returned data does not seem to be correct`))
                }
            }
            return {
                "id": packageDetails["_id"],
                "tarball_url": packageDetails["dist.tarball"],
                "version": packageDetails["version"],
            } as IFetchedPackageDetails
        }
        catch(err:any){
            throwError(err)
        }
        
    }
}