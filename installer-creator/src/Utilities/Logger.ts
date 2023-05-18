import log from "npmlog";
import { ILogger } from "../IInstallerCreator"

export const getLogger = (prefix:string, parentLogger:ILogger=null):ILogger => {
    const updatedPrefix = parentLogger ? `${parentLogger.prefix} -> ${prefix}` : prefix;

    const newLogger:any = {
        prefix: updatedPrefix
    }

    for (const method of ["verbose", "info", "warn", "error"]){
        newLogger[method] = (message:string) => log.log(method, updatedPrefix, message)
    }
    
    return newLogger as ILogger
}