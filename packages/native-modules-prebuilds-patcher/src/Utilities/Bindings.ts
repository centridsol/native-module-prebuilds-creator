import path from "path"
import fs from "fs"

// Extract from https://github.com/TooTallNate/node-bindings/blob/master/bindings.js
const bindingSettings = {
    compiled: process.env.NODE_BINDINGS_COMPILED_DIR || 'compiled',
    platform: process.platform,
    arch: process.arch,
    nodePreGyp:
      'node-v' +
      process.versions.modules +
      '-' +
      process.platform +
      '-' +
      process.arch,
    version: process.versions.node,
    bindings: 'bindings.node',
    try: [
      // node-gyp's linked version in the "build" dir
      ['module_root', 'build', 'bindings'],
      // node-waf and gyp_addon (a.k.a node-gyp)
      ['module_root', 'build', 'Debug', 'bindings'],
      ['module_root', 'build', 'Release', 'bindings'],
      // Debug files, for development (legacy behavior, remove for node v0.9)
      ['module_root', 'out', 'Debug', 'bindings'],
      ['module_root', 'Debug', 'bindings'],
      // Release files, but manually compiled (legacy behavior, remove for node v0.9)
      ['module_root', 'out', 'Release', 'bindings'],
      ['module_root', 'Release', 'bindings'],
      // Legacy from node-waf, node <= 0.4.x
      ['module_root', 'build', 'default', 'bindings'],
      // Production "Release" buildtype binary (meh...)
      ['module_root', 'compiled', 'version', 'platform', 'arch', 'bindings'],
      // node-qbs builds
      ['module_root', 'addon-build', 'release', 'install-root', 'bindings'],
      ['module_root', 'addon-build', 'debug', 'install-root', 'bindings'],
      ['module_root', 'addon-build', 'default', 'install-root', 'bindings'],
      // node-pre-gyp path ./lib/binding/{node_abi}-{platform}-{arch}
      ['module_root', 'lib', 'binding', 'nodePreGyp', 'bindings']
    ]
}

export const TryGetBindingPath = (module_root:string) => {

    let updatedOpts:any = {...bindingSettings, module_root }

    const potentialBindingName = bindingSettings.try.map((v:string[]) => {
        return path.join(...v.map((p:string) => {
            return p != "bindings" ? (updatedOpts[p] || p) : ""
        }))
    }).reduce((pv:any, cv:string)=> {

        if (!fs.existsSync(cv)){
            return pv
        }
        for (const file of fs.readdirSync(cv)){
            if (path.extname(file) === ".node"){
                pv.add(file)
            }
        }
        return pv

    }, new Set([]))


    if (potentialBindingName.size == 1){
        updatedOpts = {...updatedOpts, bindings: [...potentialBindingName][0]}
        for (const potentialPath of updatedOpts.try){
            const pathToCheck = path.join(...potentialPath.map((p:string) => {
                return updatedOpts[p] || p
            }))
    
            if (fs.existsSync(pathToCheck)){
                return pathToCheck
            }
        }
    }

    return null
}