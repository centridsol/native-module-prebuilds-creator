import path from "path";
import fs from "fs";
import jsyaml from "js-yaml";

import { IInstallerCreatorOptions, ILogger, IRunEnv as IRunEnv, SUPPORTED_PLATFORMS } from "./IInstallerCreator";
import { InstallerCreatorConsts } from "./Utilities/Consts";
import { getLogger } from "./Utilities/Logger";

import { ProjectCopier } from "./Builders/ProjectCopier/ProjectCopier";
import { DependencyInstaller } from "./Builders/DependencyInstaller/DependencyInstaller";
import { ElectronBuilder } from "./Builders/ElectronBuilder/ElectronBuilder";

export class InstallerCreator {

    private projectRootPath: string
    private electronAppPath: string
    private extraComponentsPaths: string[]

    private distFolder: string
    private distFolderPath: string

    private tempGenFolderPath:string
    private tempSrcFolderPath: string
    private tempComponentsFolder: string

    private installerCreatorOptions:IInstallerCreatorOptions
    private declaredConfigFile:IInstallerCreatorOptions

    private installerPlatforms:SUPPORTED_PLATFORMS[]

    private logger:ILogger

    constructor(projectRootPath:string, installerPlatforms: SUPPORTED_PLATFORMS[], installerCreatorOptions: IInstallerCreatorOptions) {

        this.logger = getLogger("TheiaInstallerCreator")

        this.projectRootPath = projectRootPath
        this.installerPlatforms = installerPlatforms

        this.tempGenFolderPath = path.join(this.projectRootPath, InstallerCreatorConsts.TEMP_GEN_FOLDER)
        this.tempSrcFolderPath = path.join(this.tempGenFolderPath, InstallerCreatorConsts.TEMP_GEN_SUB_FOLDERS.SRC)
        this.tempComponentsFolder = path.join(this.tempGenFolderPath, InstallerCreatorConsts.TEMP_GEN_SUB_FOLDERS.COMPONENTS)

        this.declaredConfigFile = this.LoadDeclaredConfigFile()
        this.installerCreatorOptions = this.ParseCreatorOptions(installerCreatorOptions)

        this.distFolder = this.installerCreatorOptions.distFolder
        this.distFolderPath = path.join(this.projectRootPath, this.distFolder)

        this.extraComponentsPaths = this.installerCreatorOptions.extraComponentsPaths.map((componentPath: string) => {
            return path.isAbsolute(componentPath) ? componentPath : path.join(this.projectRootPath, componentPath)
        })


        this.electronAppPath = path.join(this.projectRootPath, this.installerCreatorOptions.electronAppPathRel)
        this.ValidateConfig()
    }

    private LoadDeclaredConfigFile(){
        const declaredConfigFilePath:string = path.join(this.projectRootPath, InstallerCreatorConsts.INSTALLER_FILE_CONFIG_NAME) 
        return fs.existsSync(declaredConfigFilePath) ? jsyaml.load(fs.readFileSync(declaredConfigFilePath).toString()) : {}
    }
    
    private ParseCreatorOptions(installerCreatorOptions: IInstallerCreatorOptions){
        
        const processedOptions:any = {...installerCreatorOptions}

        for (const [prop, defaultValue] of Object.entries({
            electronAppPath:"electron-app", 
            electronEntryFile: "src-gen/frontend/electron-main.js",
            extraComponentsPaths:[],
            distFolder:"platform-installers",
            addtionalElectronSrcPaths:[],
            additionBuildPackageJsonConfig: {},
            additionalElectronBuilderConfig:  {},
            dockerOptions: null
        })){
            if (!processedOptions[prop]){
                processedOptions[prop] = defaultValue
            }
        }
       
        return {...this.declaredConfigFile, ...processedOptions}
    }

    private ValidateConfig() {
        this.ValidateInstallerPlatforms()
        this.ValidatePaths()
    }

    private ValidateInstallerPlatforms() {
        if (!Array.isArray( this.installerPlatforms)) {
            throw new Error(`The platforms variable needs to be an array`)
        }

        for (const platform of this.installerPlatforms) {
            if (!Object.values(InstallerCreatorConsts.SUPPORTED_PLATFORMS).includes(platform)) {
                throw new Error(`The platform '${platform}' is not valid/supported`)
            }
        }
    }

    private ValidatePaths() {
        for (const pathsToValidate of [this.projectRootPath, this.electronAppPath, ...this.extraComponentsPaths]) {
            if (!fs.existsSync(pathsToValidate)) {
                throw new Error(`The path '${pathsToValidate}' does not exist.`)
            }
        }

        for (const extraSrcPaths of this.installerCreatorOptions.addtionalElectronSrcPaths) {
            const electronExtraSrcPath:string = path.join(this.electronAppPath, extraSrcPaths)
            if (!fs.existsSync(electronExtraSrcPath)) {
                throw new Error(`The electron extra src path '${electronExtraSrcPath}' does not exist.`)
            }
        }

        if (!fs.existsSync(path.join(this.electronAppPath, this.installerCreatorOptions.electronEntryFile))){
            throw new Error(`The electron entry file specified does not exist. Path specified (relative to electron-app root): '${this.installerCreatorOptions.electronEntryFile}'`)
        }
    }

    Create() {
        console.log(`Build the theia ide for the following platforms: ${this.installerPlatforms}`)
        const runEnv:IRunEnv = this.GetRunEnv()
        
        new ProjectCopier(runEnv).Run()

        for (const platform of runEnv.installerPlatforms){
            new DependencyInstaller(runEnv).Run(platform)
            new ElectronBuilder(runEnv).Run(platform)
        }
        
    }

    private GetRunEnv(): IRunEnv{
        return {
            projectRootPath: this.projectRootPath,
            electronAppPath: this.electronAppPath,
            extraComponentsPaths: this.extraComponentsPaths,
            distFolder: this.distFolder,
            distFolderPath: this.distFolderPath,
            tempGenFolderPath: this.tempGenFolderPath,
            tempSrcFolderPath: this.tempSrcFolderPath,
            tempComponentsFolder: this.tempComponentsFolder,
            installerPlatforms: this.installerPlatforms,
            installerCreatorOptions: this.installerCreatorOptions,
            declaredConfigFile: this.declaredConfigFile,
            logger: this.logger
        }
    }

    

}
