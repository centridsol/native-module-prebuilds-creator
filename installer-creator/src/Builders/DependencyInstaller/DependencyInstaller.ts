import fs from "fs"
import path from "path"
import { SUPPORTED_PLATFORMS } from "src/IInstallerCreator";
import { BaseBuilder } from "../BaseBuilder";

//TODO: OVerride location
import { TheiaNativeDepen } from "";

export class DependencyInstaller extends BaseBuilder{
    async Run(platform:SUPPORTED_PLATFORMS): Promise<void> {
        this.logger.info("Building on same platform as target platform. Linking to exsiting dependencies")
        fs.symlinkSync(path.join(this.runEnv.electronAppPath, "node_modules"), path.join(this.runEnv.tempGenFolderPath, "node_modules"))
        TheiaNativeDepen.PatchNativeDepencies(this.runEnv.projectRootPath)
        
        
    }

    
}