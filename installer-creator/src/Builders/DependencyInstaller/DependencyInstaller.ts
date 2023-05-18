import fs from "fs"
import path from "path"
import { SUPPORTED_PLATFORMS } from "src/IInstallerCreator";
import { BaseBuilder } from "../BaseBuilder";
import { InstallerCreatorConsts } from "src/Utilities/Consts";

import { WindowDependencyInstaller } from "./Platforms/Windows/WindowDependencyInstaller";
import { LinuxDependencyInstaller } from "./Platforms/Linux/LinuxDependencyInstaller";

export class DependencyInstaller extends BaseBuilder{
    async Run(platform:SUPPORTED_PLATFORMS): Promise<void> {
        if (process.platform == platform){
            this.logger.info("Building on same platform as target platform. Linking to exsiting dependencies")
            fs.symlinkSync(path.join(this.runEnv.electronAppPath, "node_modules"), path.join(this.runEnv.tempGenFolderPath, "node_modules"))
        }
        else{
            this.logger.info("Building on different platform as target platform. Refetching dependencies in appropiate platform enviroment")
            this.AddDependenciesInDockerContainer(platform)
        }
    }

    AddDependenciesInDockerContainer(platform:SUPPORTED_PLATFORMS){
        if (platform == InstallerCreatorConsts.SUPPORTED_PLATFORMS.WIN32){
            new WindowDependencyInstaller(this.runEnv).InstallDependencies()
        }
        else if (platform == InstallerCreatorConsts.SUPPORTED_PLATFORMS.LINUX){
            new LinuxDependencyInstaller(this.runEnv).InstallDependencies()
        }
    }
}