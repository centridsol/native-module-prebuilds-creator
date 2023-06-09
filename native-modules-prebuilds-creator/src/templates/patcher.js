var fs = require('fs');
var path = require('path');

function _patchPackage(installedPackagePath, installedPackageJson, prebuiltDetails){
    copyFolderRecursiveSync(prebuiltDetails.prebuildPath, path.join(installedPackagePath, "prebuilds"))
    
    if (!("scripts" in installedPackageJson)){
        installedPackageJson["scripts"] = {}
    }

    if (!("install" in installedPackageJson.scripts)){
        installedPackageJson.scripts["install"] = "node-gyp-build"
    }
}

function getPrebuildManifest(){
    return require(path.join(__dirname, "prebuild-manifest.json"))
}

function validateAndSetDefaultProps(opt){
    if (!opt.projectDir){
        opt.projectDir = process.cwd()
    }

    const nodeModulePath = path.join(opt.projectDir, "node_modules")
    if (!fs.existsSync(nodeModulePath)){
        throw new Error(`Could not find the node_modules folder for the project path '${opt.projectDir}'`)
    }
    this.nodeModuleFolder = nodeModulePath

    if (!fs.existsSync(path.join(nodeModulePath, "node-gyp-build"))){
        throw new Error(`The pactcher script requires node-gyp-build to be installed. Please install it with 'npm install --save node-gyp-build' (or yarn)`)
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

    const validateAndGetInstalledNodePackage = function(package) {
        const installedPackageFolder = path.join(opt.nodeModuleFolder, package.name)
        if (!fs.existsSync(installedPackageFolder)){
            throw new Error(`Cannot patch the package '${package.name}' as it does not exist in the node_modules folder`)
        }

        const packagePath = path.join(installedPackageFolder, "package.json")
        if (!fs.existsSync(packagePath)){
            throw new Error(`The specified module '${package.name}' does not seem to be a node module.`)
        }

        const packageJson = require(packagePath)

        //TODO: Limitation - version has to be exact. Consider using semver to better checks
        if (package.version && package.version != packageJson.version){
            if (opt.onVersionMismatch == 'error'){
                throw new Error(`Could not patch the package '${package.name}'. Installed version '${packageJson.version}'. Trying to patch version '${package.version}'`)
            }

            if (opt.onVersionMismatch == 'skip'){
                console.log(`Skipping patching the package '${package.name}'. Installed version '${packageJson.version}'. Trying to patch version '${package.version}' `)
                return [installedPackageFolder, packageJson, 'skip']
            }

            if (opt.onVersionMismatch == 'force'){
                console.log(`Version mismatch the package '${package.name}'. Installed version '${packageJson.version}'. Trying to patch version '${package.version}'. Will use the lastest prebuilt version instead. `)
                
                return [installedPackageFolder, packageJson, 'continue']
            }

        }
        return [installedPackageFolder, packageJson, 'continue']

    }

    const validateAndGetPreBuiltPackageDetails = function(package, installedPackageJson, action){
        if (!(package.name in prebuildManifest)){
            throw new Error(`No prebuilds found for the package ${package.name}`)
        }

        const prebuiltPackageDetails = prebuildManifest[package.name]
        if (!(package.version in prebuiltPackageDetails)){
            throw Error(`Could not find prebuilds versions for the package '${package.name}@${package.version}'. Available prebuilt versions are listed below:- \n\n${Object.keys(prebuiltPackageDetails).join(', ')}`)
        }

        return prebuiltPackageDetails[package.version]
        
    }

    for(const package of packageDetails){
        const [installedPackagePath, installedPackageJson, action] = validateAndGetInstalledNodePackage(package)
        if (action == 'skip') {
            continue
        }

        const prebuiltDetails = validateAndGetPreBuiltPackageDetails(package, installedPackageJson, action)
        _patchPackage(installedPackagePath, installedPackageJson, prebuiltDetails)
        
    }


}





function copyFileSync( source, target ) {

    var targetFile = target;

    // If target is a directory, a new file with the same name will be created
    if ( fs.existsSync( target ) ) {
        if ( fs.lstatSync( target ).isDirectory() ) {
            targetFile = path.join( target, path.basename( source ) );
        }
    }

    fs.writeFileSync(targetFile, fs.readFileSync(source));
}

function copyFolderRecursiveSync( source, target ) {
    var files = [];

    // Check if folder needs to be created or integrated
    var targetFolder = path.join( target, path.basename( source ) );
    if ( !fs.existsSync( targetFolder ) ) {
        fs.mkdirSync( targetFolder );
    }

    // Copy
    if ( fs.lstatSync( source ).isDirectory() ) {
        files = fs.readdirSync( source );
        files.forEach( function ( file ) {
            var curSource = path.join( source, file );
            if ( fs.lstatSync( curSource ).isDirectory() ) {
                copyFolderRecursiveSync( curSource, targetFolder );
            } else {
                copyFileSync( curSource, targetFolder );
            }
        } );
    }
}