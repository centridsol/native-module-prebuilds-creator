# Native Module Prebuilds Creator
### Main package for creating the prebuilds for muiltiple native modules. 

Please see [home](https://gitlab.com/centridpub/native-module-prebuilds-creator) to get a fuller picture of this package.

## Installation 

`npm i @centrid/native-modules-prebuilds-creator` or `yarn add @centrid/native-modules-prebuilds-creator`
## Usages

This packages can be used through its CLI interface, or through is programmatic API. 
**Please Note**: This package utilitise [prebuildify](https://github.com/prebuild/prebuildify) to create the packages (acts like a prebuildify wrapper). 
This means in essence you can pass whatever build options that prebuildify accepts (programmatically), and it will pass them on. Although this is possible only the below options have been tested, and use any other ones might result in unexpected results. 

### CLI Usages

| CLI  | Default  | Description   |  Example  |   |
|---|---|---|---|---|
| --packages  | - | Native node packages you want to create prebuilds for  |  `--packages "drivelist@9.2.4,msgpackr-extract@3.0.2,native-keymap@2.5.0"` |   |
| --arch  | - | Target Architecture  |  `--arch "x64"` |   |
| --platform  | -  | Target Platform  |  `--platform "win32"`  |   |
| --targets  | -  | One or more targets  | `--targets "node@20.0.0,electron@25.0.0"`  |   |
| --out  | `process.cwd()`  | Output path for the generated prebuilds folder  |   |   |
| --onUnsupportedTargets  | `error` | What to do when a target does not seem to be support. eg when a packages specifies it only works with node >19 and above and you select node@10.0.0 as your target. `Options: 'error' or 'skip' or 'force'`    |   |   |

### Programatic Usuage

```javascript
import { PrebuildsCreator } from "@centrid/native-modules-prebuilds-creator";

const prebuilder = new PrebuildsCreator(
                    /* gloablPrebuildifyOpts:IPreBuildifyOptions */
                    {
                        arch: "x64",
                        platform: "win32",
                        targets: [
                            {
                                runtime: "node",
                                target: "25.0.0"
                            },
                            {
                                runtime: "electron",
                                target: "20.0.0"
                            },
                            {
                                // Note: You can specify a particular abi version as well
                                abiVersion: "108"
                            }
                            ]
                        }, 
                    /*  packageToProcess:IPackagesToProcess */
                    [
                        {
                            packageName: "drivelist",
                            version: "9.2.4",
                        },
                        {
                            packageName: "msgpackr-extract",
                            version: "3.0.2",
                            // Package specific prebuildify props
                            prebuildifyProps: {
                                targets: [
                                        {
                                            runtime: "node",
                                            target: "25.0.0"
                                        }
                                    ]
                            }
                        }
                    ],
                    /* dist:string */
                    path.join(__dirname, "myGeneratedPrebuilds"))).Create()

prebuilder.Create().then(()=> {
    console.log("done")
}).catch((err) => {
    console.error(err)
})

```

## Prebuilds Patcher

When the prebuilds folder is created, it has a compiled version of the prebuilds pathcher (See [home](https://gitlab.com/centridpub/native-module-prebuilds-creator)).
This version also has a CLI interface (as complare to the standalon prebuld-pactcher package). Options are highlighed below:-

### Comands: 
| CLI   | Description   |  Example  |   |
|---|---|---|---|
| patchAll  | Patch all native module is your current project using the generated prebuilds. This will look for all the native modules in your current project, check if appicable prebuilds are available, and patch as appropiate  ||   |
| patchSpecific  | Similar to patchAll, but allows you to specify what package you want to patch.  |  `--patchSpecific "drivelist@9.2.4"` |   |
| revertPatchs  | Revert patched native modules    |   |   |


### Options: 
| Option  | Default  | Description   |  Example  |  Applicable Command |
|---|---|---|---|---|
| --arch  | - | Target Architecture  |  `--arch "x64"` | patchAll, patchSpecific   |
| --platform  | -  | Target Platform  |  `--platform "win32"`  |  patchAll, patchSpecific |
| --targets  | -  | One or more targets  | `--targets "node@20.0.0,electron@25.0.0"`  | patchAll, patchSpecific  |
| --packages  | - | Packages to patch when patch specific selected  |  `--packages "drivelist@9.2.4"` | patchSpecific   
| --forceRebuildOnNoBindings  | `true`  | To patch correct prebuild-pacther at times needs to determine the correct binding file. If the native module has not be built, it cannot figure this out. This rebuild the project, so as to be able to obtain the correct binding file to patch  |  | patchAll, patchSpecific  |
| --shouldBackup  | `true`  | Should back up native package before patching. Allow you to revert patches after building. (see `--revertPatchs` below)  |   |  patchAll, patchSpecific |
| --onPatchFail  | `error`  | What to do when a patch fail. `Options: 'error' or 'skip'` Note: On error all patchs are reverted (i.e revertPatchs is called)  |   |  patchAll, patchSpecific |
| --onNoPrebuildsFound  | `skip` | When no prebuilds found for native module currently installed for your project `Options: 'error' or 'skip'`  |   | patchAll, patchSpecific   |
| --projectPath  | determines from `process.cwd()` | Project path which the patch will be applied to |   |  patchAll, patchSpecific, revertPatchs |
