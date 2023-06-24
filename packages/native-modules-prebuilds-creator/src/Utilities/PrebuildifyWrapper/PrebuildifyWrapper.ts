import os from "os"
import path from "path"
import preBuildify from "prebuildify"

const getPlatformCommand = () => {
    if (os.platform() === 'win32'){
        process.env["NM_PREBUILDS_CREATOR_NODE_GYP_PATH"] = require.resolve('node-gyp/bin/node-gyp.js')
        return path.join(__dirname, "prebuildifyWinWrapper.bat")
    }else{
        return require.resolve('node-gyp/bin/node-gyp.js')
    }
}

export const PrebuildifyWrapper = (prebuildifyOptions:any, callback:(err:any) => void) => {
    preBuildify({...prebuildifyOptions, nodeGyp: getPlatformCommand()}, callback)
} 