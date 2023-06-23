# Native Module Prebuilds Creator
#### Create prebuilds for multipe native node modules

This package allow you to create prebuilds for multiple native node modules that can then be later on used within you projects. 
It does this by fetching specified node modules (native), building them (using [prebuildify](https://github.com/prebuild/prebuildify)), and then creating a package with all the prebuilds. 
An example of the prebuilds package created is below

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

As can be seen from the above, the generated package will include the compiled version of the sub-package [native-module-prebuilds-patcher](). 
This will allow you to auto patch applicable native node modules in your current with the applicable runtime whilst building (and then revert the patchs when done). 
For instance if you are using [electron-builder](https://github.com/electron-userland/electron-builder) your configuration can look something like this

```javascript
const builder = require("electron-builder")
const myGeneratedPrebuilds = require("./myGeneratedPrebuilds")

builder.build({
  targets: Platform.WINDOWS.createTarget(),
  config: {
     beforeBuild : function(context) {
      return myGeneratedPrebuilds.PatchAll(context.arch, context.platform.nodeName, `electron@${context.electronVersion}`)
    },
    afterAllArtifactBuild: function(){
        myGeneratedPrebuilds.RevertPatchs()
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



## Documetation

* For the prebuilds creator see - [Native Module Prebuild Creator]()
* For the prebuilds patcher see - [Native Module Prebuild Patcher]()


## Why?

Some might be wondering, why?, as packages are usually built on install (and tools like electron-rebuilder can do it for you). Well, this reason for this is 2 fold:-

1. Making your build process more deterministic - When working on a project locally, and as a single developer, the above reason is quite valid. However, when you are working on a team, and have CI process you might want to ensure that everyone running you app/project is using the same baniaries. This allows you produced them centrally, and distributed in your team/shared with you CI process. This thinking is partly why tool like prebuildify/prebuild-install exist. However in those tool, the onus is on the package maintainer to create the binaries .
2. Making your build process platform agnostic - Native module are usually built against the environement you building them in (platform/arch etc). Hence banaries build on linux, will most likely not work in windows and vice-versa. This package attempts to locate the applicable binaries for your specified target environement and use/patch those when packaging your application.  This means you can package your application for Windows using Linux (given than your generated prebuilds folder contains the applicable binaries). This is particularly useful for CI processes are they usually rely on some variant of linux. 


## Future improvements and other notes

* Most of the operations in these packages are run synchronosly, of which performance gains can be made running most  of these operations asynchronusly. This will be considered for future releases


## Contributing

Native Module Prebuilds Creator is an opensource project and contributions are valued. If there is a bug fix please create a pull request explain what the bug is, how you fixed and tested it.

If it's a new feature, please add it as a issue with the label enhancement, detailing the new feature and why you think it's needed. Will discuss it there and once it's agreed upon you can create a pull request with the details highlighted above. 

## Authors

* **Chido Warambwa** - *Initial Work* - [chidow@centridsol.tech](mailto://chidow@centridsol.tech) 
  
## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details


