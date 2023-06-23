
import { PrebuildsPatcher } from "@centrid/native-modules-prebuilds-patcher";
import path from "path"

const nativeModulePrebuildsPatcher:PrebuildsPatcher = new PrebuildsPatcher(path.join(__dirname, "prebuild-manifest.json"));

// TODO: CLI

module.exports = nativeModulePrebuildsPatcher




