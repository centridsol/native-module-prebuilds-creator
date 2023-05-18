import { PlatformDependencyInstaller } from "../PlatformDependencyInstaller";

export class WindowDependencyInstaller extends PlatformDependencyInstaller{
    protected GetDockerImage(): string {
        // TODO: might work for all
        return "electronuserland/builder:wine"
    }

    protected GetShellCommand(): string {
        throw "bash"
    }
    protected GetPlatformDepInstallerName(): string {
        return "LinuxDepInstaller"
    }


}