Below is the corrected version of the README file:

# Native Module Prebuilds Creator
### Main package for creating prebuilds for multiple native modules.

Please see [home](https://gitlab.com/centridpub/native-module-prebuilds-creator) to get a fuller picture of this package.

## Installation

```shell
npm i @centrid/native-modules-prebuilds-creator
```
```shell
yarn add @centrid/native-modules-prebuilds-creator
```

## Usage

This package can be used through its CLI interface or through its programmatic API.

**Please Note**:

- This package utilizes [prebuildify](https://github.com/prebuild/prebuildify) to create the packages (acts like a prebuildify wrapper). This means you can pass any build options that prebuildify accepts programmatically, and it will pass them on. However, only the below options have been tested, and using any other ones might result in unexpected results.
- When you specify the same output, the prebuilds content is merged, not overridden. This means you can run the prebuild creator on Linux, then on Windows, and then on macOS to get prebuilds that cater to all those platforms.

### CLI Usage

| CLI | Default | Description | Example | |
| --- | --- | --- | --- | --- |
| --packages | - | Native node packages you want to create prebuilds for | `--packages "drivelist@9.2.4,msgpackr-extract@3.0.2,native-keymap@2.5.0"` | |
| --arch | - | Target Architecture | `--arch "x64"` | |
| --platform | - | Target Platform | `--platform "win32"` | |
| --targets | - | One or more targets | `--targets "node@20.0.0,electron@25.0.0"` | |
| --out | `process.cwd()` | Output path for the generated prebuilds folder | | |
| --onUnsupportedTargets | `error` | What to do when a target does not seem to be supported. For example, when a package specifies it only works with Node.js versions 19 and above, and you select Node.js 10.0.0 as your target. Options: 'error' or 'skip' or 'force' | | |

### Programmatic Usage

```javascript
import { PrebuildsCreator } from "@centrid/native-modules-prebuilds-creator";

const prebuilder = new PrebuildsCreator(
  /* globalPrebuildifyOpts: IPreBuildifyOptions */
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
        // Note: You can specify a particular ABI version as well
        abiVersion: "108"
      }
    ]
  },
  /* packageToProcess: IPackagesToProcess */
  [
    {
      packageName: "drivelist",
      version: "9.2.4"
    },
    {
      packageName: "msgpackr-extract",
      version: "3.0.2",
      // Package-specific prebuildify props
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
  /* dist: string */
  path.join(__dirname, "myGeneratedPrebuilds")
).Create();

prebuilder
  .Create()
  .then(()

 => {
    console.log("done");
  })
  .catch((err) => {
    console.error(err);
  });
```

## Prebuilds Patcher

When the prebuilds folder is created, it has a compiled version of the prebuilds patcher (See [Native Module Prebuild Patcher](https://gitlab.com/centridpub/native-module-prebuilds-creator/-/tree/master/packages/native-modules-prebuilds-patcher)). This version also wraps the appropriate `prebuild-manifest.json` and returns an instantiated version of the PrebuildsPatcher when imported. Additionally, it has a CLI interface that you can use to patch. Options are highlighted below:

### Commands:

| CLI | Description |  |
| --- | --- | --- | 
| patchAll | Patch all native modules in your current project using the generated prebuilds. This will look for all the native modules in your current project, check if applicable prebuilds are available, and patch as appropriate | | 
| patchSpecific | Similar to patchAll, but allows you to specify which package you want to patch |  
| revertPatches | Revert patched native modules | | 


### Options:

| Option | Default | Description | Example | Applicable Command |
| --- | --- | --- | --- | --- |
| --arch | - | Target Architecture | `--arch "x64"` | patchAll, patchSpecific |
| --platform | - | Target Platform | `--platform "win32"` | patchAll, patchSpecific |
| --targets | - | One or more targets | `--targets "node@20.0.0,electron@25.0.0"` | patchAll, patchSpecific |
| --packages | - | Packages to patch when patch specific is selected | `--packages "drivelist@9.2.4"` | patchSpecific |
| --forceRebuildOnNoBindings | `true` | To patch the correct prebuild-patcher at times, it needs to determine the correct binding file. If the native module has not been built, it cannot figure this out. This rebuilds the project so as to be able to obtain the correct binding file to patch | | patchAll, patchSpecific |
| --shouldBackup | `true` | Should back up native package before patching. Allows you to revert patches after building. (see `--revertPatches` below) | | patchAll, patchSpecific |
| --onPatchFail | `error` | What to do when a patch fails. Options: 'error' or 'skip'. Note: On error, all patches are reverted (i.e., revertPatches is called) | | patchAll, patchSpecific |
| --onNoPrebuildsFound | `skip` | When no prebuilds are found for a native module currently installed in your project. Options: 'error' or 'skip' | | patchAll, patchSpecific |
| --projectPath | Determines from `process.cwd()` | Project path to which the patch will be applied | | patchAll, patchSpecific, revertPatches |

To use the patcher programmatically, please see [Native Module Prebuild Patcher](https://gitlab.com/centridpub/native-module-prebuilds-creator/-/tree/master/packages/native-modules-prebuilds-patcher)