# Native Module Prebuilds Patcher
### Main package for patching native module prebuilds created by Native Module Prebuilds Creator 

Please see [home](https://gitlab.com/centridpub/native-module-prebuilds-creator) to get a fuller picture of this package.

**Important Note:** In most cases you do not need to use the package directly as it is bundles with the generated prebuilds folder created using the [Native Module Prebuild Creator](https://gitlab.com/centridpub/native-module-prebuilds-creator/-/tree/master/packages/native-modules-prebuilds-creator). The wraps the appropiate `prebuild-manifest.json` files, and exposes and CLI interface.  Unless there is a specific reason use that one instead.

## Installation 

`npm i @centrid/native-modules-prebuilds-patcher` or `yarn add @centrid/native-modules-prebuilds-patcher`

## Usages


```javascript
import { PrebuildsPatcher } from "@centrid/native-modules-prebuilds-patcher";

const patcher = new PrebuildsPatcher(path.join(__dirname, "<path-to-generated-prebuild-manifest.json"), 
                                                /* patcherOptions:IPactherOptions */
                                                {})

/*
Patch all native module is your current project using the generated prebuilds. This will look for all the native modules in your current project, check if appicable prebuilds are available, and patch as appropiate

async PatchAll(arch:string, platform:string, runtime:string)
*/
let patcherPromise = patcher.PatchAll("x64", "win32", "electron@25.0.0")

// OR

/*
Similar to patchAll, but allows you to specify what package you want to patch.

async Patch(packagesToPatch:string[], arch:string, platform:string, runtime:string)
*/
patcherPromise = patcher.Patch(["drivelist@9.2.4","msgpackr-extract@3.0.2"], "x64", "win32", "electron@25.0.0")

// OR

/*
Revert patched native modules

RevertPatchs()
*/
patcherPromise = patcher.RevertPatches()
```

                                                