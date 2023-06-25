
import logger from "npmlog"
import semver from 'semver'

export class SharedHelpers{
    
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
}