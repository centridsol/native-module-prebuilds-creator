# Native Module Prebuilds Patcher
### Main package for patching native module prebuilds created by the Native Module Prebuilds Creator

**Please Note**: This project is maintained on [gitlab.com](https://gitlab.com/centridpub/native-module-prebuilds-creator/-/tree/master/packages/native-modules-prebuilds-patcher)

Please see the [home](https://gitlab.com/centridpub/native-module-prebuilds-creator) page to get a fuller picture of this package.

**Important Note:** In most cases, you do not need to use the package directly as it is bundled with the generated prebuilds folder created using the [Native Module Prebuild Creator](https://gitlab.com/centridpub/native-module-prebuilds-creator/-/tree/master/packages/native-modules-prebuilds-creator). It wraps the appropriate `prebuild-manifest.json` files, exposes a CLI interface, and unless there is a specific reason, it is recommended to use that one instead.

## Installation

To install the Native Module Prebuilds Patcher, use either of the following commands:

```shell
npm i @centrid/native-modules-prebuilds-patcher
```
```shell
yarn add @centrid/native-modules-prebuilds-patcher
```

## Usage

```javascript
import { PrebuildsPatcher } from "@centrid/native-modules-prebuilds-patcher";

const patcher = new PrebuildsPatcher(
  path.join(__dirname, "<path-to-generated-prebuild-manifest.json>"), 
  /* patcherOptions:IPatcherOptions */
  {}
);

/*
Patch all native modules in your current project using the generated prebuilds. This will look for all the native modules in your current project, check if applicable prebuilds are available, and patch them as appropriate.

async PatchAll(arch: string, platform: string, runtime: string)
*/
let patcherPromise = patcher.PatchAll("x64", "win32", "electron@25.0.0");

// OR

/*
Similar to PatchAll, but allows you to specify the packages you want to patch.

async Patch(packagesToPatch: string[], arch: string, platform: string, runtime: string)
*/
patcherPromise = patcher.Patch(["drivelist@9.2.4", "msgpackr-extract@3.0.2"], "x64", "win32", "electron@25.0.0");

// OR

/*
Revert patched native modules

RevertPatches()
*/
patcherPromise = patcher.RevertPatches();
```

Other methods available:

```javascript
/*
Set the project path that contains the native modules to be patched

SetProjectPath(projectDir: string)
*/
patcher.SetProjectPath("<alternate-project-dir>");

/*
Update the patcher options

UpdatePatcherOptions(options: IPatcherOptions)
*/
patcher.UpdatePatcherOptions("<options>");
```

Please correct any grammatical or spelling errors for the readme file above.


## Future Improvements and Other Notes

* Most of the operations in these packages are run synchronously, and performance gains can be made by running most of these operations asynchronously. This will be considered for future releases.

## Contributing

Native Module Prebuilds Creator is an open-source project, and contributions are welcome. If you have a bug fix, please create a pull request explaining what the bug is, how you fixed it, and how you tested it.

If it's a new feature, please add it as an issue with the "enhancement" label, providing details about the new feature and why you think it's needed. We will discuss it there, and once it's agreed upon, you can create a pull request with the highlighted details.

## Authors

* **Chido W** - *Initial Work* - [chidow@centridsol.tech](mailto:chidow@centridsol.tech) 
  
## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.