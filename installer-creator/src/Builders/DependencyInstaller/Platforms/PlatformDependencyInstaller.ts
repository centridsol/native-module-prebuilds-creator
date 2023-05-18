import { ILogger, IRunEnv } from "src/IInstallerCreator"
import { getLogger } from "src/Utilities/Logger"

export abstract class PlatformDependencyInstaller{

    protected runEnv:IRunEnv
    protected logger:ILogger

    constructor(runEnv:IRunEnv){
        this.runEnv = runEnv
        this.logger = getLogger(this.GetPlatformDepInstallerName(), runEnv.logger)
    }
    
    async InstallDependencies() : Promise<void>{
        this.logger.info("Installing depedencies for environment")
    }

    protected async DoInstallDependencies(): Promise<void>{
        
    }

    protected abstract GetDockerImage(): string
    protected abstract GetShellCommand(): string
    protected abstract GetPlatformDepInstallerName(): string
}