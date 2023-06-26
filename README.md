# Native Module Prebuilds Creator
#### Create prebuilds for multiple native Node.js modules

This package allows you to create prebuilds for multiple native Node.js modules that can be used later in your projects. It achieves this by fetching specified native modules, building them using [prebuildify](https://github.com/prebuild/prebuildify), and creating a package with all the prebuilds. Below is an example of the structure of the prebuilds package:

```bash
myGeneratedPrebuilds/
├── package.json
├── prebuild-manifest.json
├── prebuild-patcher.js
└── prebuilds
    ├── drivelist@9.2.4
    │   ├── linux-x64
    │   │   └── electron.abi113.node
    │   └── win32-x64
    │       ├── electron.abi113.node
    │       └── electron.abi116.node
    ├── msgpackr-extract@3.0.2
    │   └── win32-x64
    │       ├── electron.abi113.node
    │       └── electron.abi116.node
    ├── native-keymap@2.5.0
    │   ├── linux-x64
    │   │   └── electron.abi113.node
    │   └── win32-x64
    │       ├── electron.abi113.node
    │       └── electron.abi116.node
    ├── node-pty@0.11.0-beta17
    │   ├── linux-x64
    │   │   └── electron.abi113.node
    │   └── win32-x64
    │       ├── electron.abi113.node
    │       ├── electron.abi116.node
    │       └── winpty.dll
    └── nsfw@2.2.4
        ├── linux-x64
        │   └── electron.abi113.node
        └── win32-x64
            ├── electron.abi113.node
            └── electron.abi116.node
```

As seen from the above example, the generated package includes the compiled version of the sub-package [native-module-prebuilds-patcher](https://gitlab.com/centridpub/native-module-prebuilds-creator/-/tree/master/packages/native-modules-prebuilds-patcher). This allows you to automatically patch applicable native Node.js modules in your current project with the appropriate runtime during the build process (and then revert the patches when done). For instance, if you are using [electron-builder](https://github.com/electron-userland/electron-builder), your configuration can look something like this:

```javascript
const builder = require("electron-builder")
const myGeneratedPrebuilds = require("./myGeneratedPrebuilds")

builder.build({
  targets: Platform.WINDOWS.createTarget(),
  config: {
    beforeBuild: function(context) {
      return myGeneratedPrebuilds.PatchAll(context.arch, context.platform.nodeName, `electron@${context.electronVersion}`)
    },
    afterAllArtifactBuild: function() {
      myGeneratedPrebuilds.RevertPatches()
    }
  }
})
.then((result) => {
  console.log(JSON.stringify(result))
})
.catch((error) => {
  console.error(error)
})
```

**Note:** If the output location of the generated package already exists, it merges the output instead of overwriting it. Therefore, if you run this on different platforms, it will accumulate the different environment binaries, providing you with a central place containing all the different environment binaries.

## Documentation

* For the prebuilds creator, see [Native Module Prebuild Creator](https://gitlab.com/centridpub/native-module-prebuilds-creator/-/tree/master/packages/native-modules-prebuilds-creator)
* For the prebuilds patcher, see [Native Module Prebuild Patcher](https://gitlab.com/centridpub/native-module-prebuilds-creator/-/tree/master/packages/native-modules-prebuilds-patcher)

## Why?

Some might be wonder, why? Arent packages usually built during installation (and can't tools like electron-rebuilder do it for you during build processes). Well, the reason for this is primarily twofold:

1. Making your build process more deterministic: When working on a project locally as a single developer, the aforementioned reason is quite valid. However, when you are working in a team and have a CI process, you might want to ensure that everyone building the app/project is using the same binaries. This allows you to produce them centrally and distribute them within your team or share them with your CI process. This thinking is partly why tools like prebuildify/prebuild-install exist. However, in those tools, the responsibility falls on the package maintainer to create the binaries.
2. Making your build process platform agnostic: Native modules are usually built against the environment in which they are built (platform/arch, etc.). Therefore, binaries built on Linux will most likely not work on Windows, and vice versa. This  attempts to locate the appropriate binaries for your specified target environment and use/patch them when packaging your application. This means you can package your application for Windows using Linux (given that your generated prebuilds folder contains the appropriate binaries). This is particularly useful for CI processes as they usually rely on some variant of Linux.

## Future Improvements and Other Notes

* Most of the operations in these packages are run synchronously, and performance gains can be made by running most of these operations asynchronously. This will be considered for future releases.

## Contributing

Native Module Prebuilds Creator is an open-source project, and contributions are welcome. If you have a bug fix, please create a pull request explaining what the bug is, how you fixed it, and how you tested it.

If it's a new feature, please add it as an issue with the "enhancement" label, providing details about the new feature and why you think it's needed. We will discuss it there, and once it's agreed upon, you can create a pull request with the highlighted details.

## Authors

* **Chido W**  - *Initial Work* - [chidow@centridsol.tech](mailto:chidow@centridsol.tech) 
  
## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.