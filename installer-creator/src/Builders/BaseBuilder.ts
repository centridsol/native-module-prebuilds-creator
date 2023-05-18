import { getLogger } from "src/Utilities/Logger"
import { ILogger, IRunEnv, SUPPORTED_PLATFORMS } from "../IInstallerCreator"

export abstract class BaseBuilder{
    protected runEnv
    protected logger:ILogger

    constructor(runEnv:IRunEnv){
        this.runEnv = runEnv
        this.logger = getLogger(this.GetBuilderName(), runEnv.logger) 
    }

    async Run(platform:SUPPORTED_PLATFORMS=null): Promise<void>{
        this.logger.info(`Running '${this.GetBuilderName()}'`)
    }

    protected GetBuilderName(){
        return this["constructor"].name
    }
}