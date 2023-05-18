import { PlatformDependencyInstaller } from "../PlatformDependencyInstaller";

export class LinuxDependencyInstaller extends PlatformDependencyInstaller{
    protected GetDockerImage(): string {
        throw new Error("Method not implemented.");
    }
    protected GetShellCommand(): string {
        throw new Error("Method not implemented.");
    }
    protected async DoInstallDependencies() {
        throw new Error("Method not implemented.");
    }

    protected GetPlatformDepInstallerName(): string {
        return "WinDepInstaller"
    }

}