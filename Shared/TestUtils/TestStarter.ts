import fs from "fs"
import rimraf from "rimraf";

import TestConsts from "./Consts";

module.exports = async () => {
    if (fs.existsSync(TestConsts.testTempDir)){
        rimraf.sync(TestConsts.testTempDir);
    }
};