
const { spawnSync } = require("child_process")
const fs = require("fs")

try{
    let electronLocator = require("electron-rebuild/lib/src/electron-locator").locateElectronModule
    electronLocator().then(function(ePath){
        if (ePath){
            console.log("Electron already installed")
        }
        else{
            console.log(ePath)
            InstallElectron()
        }
    }).catch(function(ee){
       InstallElectron()
    })
}
catch{
    InstallElectron()
}

function InstallElectron(){
    let electronVerson = null
    const theiaElectronPackageDetails = JSON.parse(fs.readFileSync(require.resolve(`@theia/electron/package.json`)).toString())

    for (const [peerPackage, version] of Object.entries(theiaElectronPackageDetails.peerDependencies || {})){
        if (peerPackage == "electron"){
            electronVerson = version
            break;
        }
    }

    if (!electronVerson){
        throw new Error(`Could not determine which version of electron to install`)
    }

    //Try, add npm
    console.log(`Electron not found. Installing version ${electronVerson}`)
    spawnSync("yarn", ["add", "--peer", "--no-lockfile", `electron@${electronVerson}`], {stdio: 'inherit'})
}
