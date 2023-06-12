var fs = require('fs');
var path = require('path');

function _patchPackage(installedPackagePath, installedPackageJson, prebuiltDetails){
    copyFolderRecursiveSync(path.join(__dirname, prebuiltDetails.prebuildPath), path.join(installedPackagePath, "prebuilds"))
    
    if (!("scripts" in installedPackageJson)){
        installedPackageJson["scripts"] = {}
    }

    if (!("install" in installedPackageJson.scripts)){
        installedPackageJson.scripts["install"] = "node-gyp-build"
    }
}

function getPrebuildManifest(){
    return JSON.parse(fs.readFileSync(path.join(__dirname, "prebuild-manifest.json")).toString())
}

function validateAndSetDefaultProps(opt){
    if (!opt.projectDir){
        opt.projectDir = process.cwd()
    }

    const nodeModulePath = path.join(opt.projectDir, "node_modules")
    if (!fs.existsSync(nodeModulePath)){
        throw new Error(`Could not find the node_modules folder for the project path '${opt.projectDir}'`)
    }
    opt.nodeModuleFolder = nodeModulePath

    if (!fs.existsSync(path.join(nodeModulePath, "node-gyp-build"))){
        throw new Error(`The pactcher script requires node-gyp-build to be installed. Please install it with 'npm install --save node-gyp-build' (or yarn)`)
    }

    if (!opt.onVersionMismatch){
        opt.onVersionMismatch = 'error'
    }
}

/**
 * 
 * @param {Object[]} packageDetails 
 * @param {string} packageDetails[].name 
 * @param {string} packageDetails[].version 
 * @param {Object} opt
 * @param {string} opt.projectDir
 * @param {'error' | 'force' | 'skip'} opt.onVersionMismatch
 */
function patch(packageDetails, opt){
    validateAndSetDefaultProps(opt)

    const prebuildManifest = getPrebuildManifest()

    const validateAndGetInstalledNodePackage = function(nativePackage) {
        const installedPackageFolder = path.join(opt.nodeModuleFolder, nativePackage.name)
        if (!fs.existsSync(installedPackageFolder)){
            throw new Error(`Cannot patch the package '${nativePackage.name}' as it does not exist in the node_modules folder`)
        }

        const packagePath = path.join(installedPackageFolder, "package.json")
        if (!fs.existsSync(packagePath)){
            throw new Error(`The specified module '${nativePackage.name}' does not seem to be a node module.`)
        }

        const packageJson = JSON.parse(fs.readFileSync(packagePath).toString())

        //TODO: Limitation - version has to be exact. Consider using semver to better checks
        if (nativePackage.version && nativePackage.version != packageJson.version){
            if (opt.onVersionMismatch == 'error'){
                throw new Error(`Could not patch the package '${nativePackage.name}'. Installed version '${packageJson.version}'. Trying to patch version '${nativePackage.version}'`)
            }

            if (opt.onVersionMismatch == 'skip'){
                console.log(`Skipping patching the package '${nativePackage.name}'. Installed version '${packageJson.version}'. Trying to patch version '${nativePackage.version}' `)
                return [installedPackageFolder, packageJson, 'skip']
            }

            if (opt.onVersionMismatch == 'force'){
                console.log(`Version mismatch the package '${nativePackage.name}'. Installed version '${packageJson.version}'. Trying to patch version '${nativePackage.version}'. Will use the lastest prebuilt version instead. `)
                
                return [installedPackageFolder, packageJson, 'continue']
            }

        }
        return [installedPackageFolder, packageJson, 'continue']

    }

    const validateAndGetPreBuiltPackageDetails = function(nativePackage, installedPackageJson, action){
        if (!(nativePackage.name in prebuildManifest)){
            throw new Error(`No prebuilds found for the package ${nativePackage.name}`)
        }

        const prebuiltPackageDetails = prebuildManifest[nativePackage.name]
        if (!(nativePackage.version in prebuiltPackageDetails)){
            throw Error(`Could not find prebuilds versions for the package '${nativePackage.name}@${nativePackage.version}'. Available prebuilt versions are listed below:- \n\n${Object.keys(prebuiltPackageDetails).join(', ')}`)
        }

        return prebuiltPackageDetails[nativePackage.version]
        
    }

    for(const nativePackage of packageDetails){
        const [installedPackagePath, installedPackageJson, action] = validateAndGetInstalledNodePackage(nativePackage)
        if (action == 'skip') {
            continue
        }

        const prebuiltDetails = validateAndGetPreBuiltPackageDetails(nativePackage, installedPackageJson, action)
        _patchPackage(installedPackagePath, installedPackageJson, prebuiltDetails)
        
    }

}


function copyFolderRecursiveSync(source, destination) {
    if (fs.lstatSync(source).isDirectory()) {
      if (!fs.existsSync(destination)) {
        fs.mkdirSync(destination);
      }

      const files = fs.readdirSync(source);
  
      files.forEach(file => {
        const originalPath = path.join(source, file);
        const newPath = path.join(destination, file);
  
        if (fs.lstatSync(originalPath).isDirectory()) {
          copyFolderRecursiveSync(originalPath, newPath);
        } else {
          fs.copyFileSync(originalPath, newPath);
        }
      });
    } else {
      fs.copyFileSync(source, destination);
    }
  }
module.exports = {
    patchNativeModules: patch
}