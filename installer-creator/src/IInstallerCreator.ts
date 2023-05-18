import { DockerOptions } from "dockerode"
import { Logger } from "npmlog"

export type SUPPORTED_PLATFORMS = "win32" | "linux"

export interface IInstallerCreatorOptions{

  electronAppPathRel?:string, 
  // main, ralative to the electronAppPath
  electronEntryFile?: string
  extraComponentsPaths?:string[],
  distFolder?:string,

  addtionalElectronSrcPaths?:string[]
  additionBuildPackageJsonConfig?: {[config:string]:any}
  additionalElectronBuilderConfig?:  {[config:string]:any}
}

export interface IRunEnv{
    projectRootPath: string
    electronAppPath: string
    extraComponentsPaths: string[]
    distFolder: string
    distFolderPath: string
    tempGenFolderPath:string
    tempSrcFolderPath: string
    tempComponentsFolder: string
    installerCreatorOptions:IInstallerCreatorOptions
    declaredConfigFile:IInstallerCreatorOptions
    installerPlatforms:SUPPORTED_PLATFORMS[],
    logger:ILogger
}

export type ILogger = {
  prefix: string
  verbose: (message:string) => void
  info: (message:string) => void
  warn: (message:string) => void
  error: (message:string) => void
} | null