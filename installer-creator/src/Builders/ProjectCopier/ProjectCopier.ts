import fs from "fs"
import rimraf from "rimraf"
import path from "path"

import { BaseBuilder } from "../BaseBuilder";
import { InstallerCreatorConsts } from "../../Utilities/Consts"

export class ProjectCopier extends BaseBuilder{
    async Run() {
        this.CreateBuildFolders()
        this.CreatePackageJson()
    }

    private CreateBuildFolders() {
        this.logger.verbose("Creating dist folders")
        if (fs.existsSync(this.runEnv.tempGenFolderPath)) {
            rimraf.sync(this.runEnv.tempGenFolderPath);
        }
        fs.mkdirSync(this.runEnv.tempGenFolderPath)

        fs.mkdirSync(this.runEnv.tempSrcFolderPath)
        fs.mkdirSync(this.runEnv.tempComponentsFolder)

        this.logger.verbose("Linking to electrong app")
        for (const electronAppSubPath of ["lib", "src-gen", ...this.runEnv.installerCreatorOptions.addtionalElectronSrcPaths]) {
            const electronAppPath = path.join(this.runEnv.electronAppPath, electronAppSubPath)
            if (fs.existsSync(electronAppPath)) {
                const linkToPath:string = path.join(this.runEnv.tempSrcFolderPath, electronAppSubPath)
                if (!fs.existsSync(path.dirname(linkToPath))){
                    fs.mkdirSync(path.dirname(linkToPath), {recursive:true})
                }
                fs.symlinkSync(electronAppPath, linkToPath)
            }
        }

        this.logger.verbose("Adding componenets symbolic links")
        for (const componentPath of this.runEnv.extraComponentsPaths) {
            fs.symlinkSync(componentPath, path.join(this.runEnv.tempComponentsFolder, path.basename(componentPath)))
        }

    }

    private CreatePackageJson() {
        this.logger.verbose("Adding build package.json")

        const rootPackageJson = JSON.parse(fs.readFileSync(path.join(this.runEnv.projectRootPath, "package.json")).toString())
        const electronnAppPackageJson = JSON.parse(fs.readFileSync(path.join(this.runEnv.electronAppPath, "package.json")).toString())

        const mergedPackageJson = {
            name: rootPackageJson.name,
            main: path.join(InstallerCreatorConsts.TEMP_GEN_SUB_FOLDERS.SRC, this.runEnv.installerCreatorOptions.electronEntryFile),
            version: rootPackageJson.version,
            dependencies: electronnAppPackageJson.dependencies,
            workspaces: fs.readdirSync(this.runEnv.tempComponentsFolder).filter( (pFolder:string) => {
                return fs.statSync(path.join(this.runEnv.tempComponentsFolder, pFolder)).isDirectory()
            }).map((componentPath) => {
                return path.relative(this.runEnv.tempGenFolderPath, path.join(this.runEnv.tempComponentsFolder, componentPath))
            }),
            ...this.runEnv.installerCreatorOptions.additionBuildPackageJsonConfig
        }

        fs.writeFileSync(path.join(this.runEnv.tempGenFolderPath, "package.json"), JSON.stringify(mergedPackageJson, null, 4))

    }
}