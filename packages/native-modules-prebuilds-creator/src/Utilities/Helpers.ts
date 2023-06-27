import spawn from "cross-spawn";
import fs from "fs"
import path from "path"
import sanitize from "sanitize-filename"
import { IFetchedPackageDetails, IPackageItem } from "../IPrebuildsCreator";
import logger from "npmlog"
import semver from 'semver'
export class Helpers{

    static GetLoggger(prefix:string){
        return new Proxy(logger, {
            get(target, propKey, receiver) {
                if (['error', 'silly', 'verbose', 'info','warn','error'].includes(propKey as string)) {
                    return (message: string) => {
                        target[propKey as string](prefix, message)
                    }
                }                
                return Reflect.get(target, propKey, receiver);
            },
        })
    }

    static CLIVersionItemValidator(versionItem:string, versionRequired:boolean, itemDescrip:string){
        const validateItems = (versionItem:string[]) => {
            for (const vI of versionItem){
                let itemName:string = null
                let itemVersion:string  = null
    
                if (vI.includes("@")){
                    const d = vI.split("@")
                    itemName = d[0], 
                    itemVersion = d[1]
                }
                else{
                    itemName = vI
                }
    
                if (!(/^[\w-]+$/.test(itemName))){
                    throw new Error(`The ${itemDescrip} name '${itemName}' is not valid.`)
                }
                if ((versionRequired || itemVersion) && !(() => {try {return new semver.Range(itemVersion)}catch{return false}})() ){
                    throw new Error(`The version number for the ${itemDescrip} '${itemName}' does not seem to be valid.`)
                }
            }
            return true
        }
        if (versionItem.includes(",")){
            return validateItems(versionItem.split(","))
        }
    
        return validateItems([versionItem])
    }

    static MakeNameSafe(name:string){
        return sanitize(name)
    }

    static SpwanFetchPackage(packageName:string, outputFolderPath:string){
        const result = spawn.sync("npm", ["pack", packageName, "--pack-destination", outputFolderPath], {stdio: "pipe"})
        if (result.status != 0){
            throw new Error(`An error occured trying to fetched the package '${packageName}'. \n\nError message:- ${result.stderr.toString()}`)
        }
    }

    static InstallDependencies(packageName:string, packagePath:string){
        const result = spawn.sync("npm", ["install", "--ignore-scripts"], {stdio: "inherit", cwd: packagePath})
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

        const result = spawn.sync("npm", ["view", fetchPackageName, "--json", "_id", "dist.tarball", "version"], {stdio: "pipe"})
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