
import { PrebuildsPatcher } from "@centrid/native-modules-prebuilds-patcher";
import path from "path"
import yargs  from 'yargs'
import { hideBin } from 'yargs/helpers'
import { SharedHelpers } from '../../../Shared/Utilities/Helpers'
import { IPactherOptions } from "@centrid/native-modules-prebuilds-patcher/src/IPrebuildsPatcher";



const allOptions:any[] = [
    {
        name: "arch",
        details: {
            describe: 'Target Architecture',
            type: 'string',
            require: true,
            alias: 'a',
        },
        supports: ["patchAll", "patchSpecific"]
    },
    {
        name: "platform",
        details: {
            describe: 'Target Platform',
            type: 'string',
            require: true,
            alias: 'b',
        },
        supports: ["patchAll", "patchSpecific"]
    },
    {
        name: "target",
        details: {
            describe: 'Target to use (e.g node@20.0.0)',
            type: 'string',
            require: true,
            alias: 't',
        },
        supports: ["patchAll", "patchSpecific"],
        check:(argv:any)=>{
            if (argv.t.includes(",")){
                throw new Error(`Can only select on target`)
            }
            return SharedHelpers.CLIVersionItemValidator(argv.t, true, "target")
        }
    },
    {
        name: "packages",
        details: {
            describe: 'Specific packages to patch',
            type: 'string',
            require: true,
            alias: 'p',
        },
        supports: ["patchSpecific"],
        check:(argv:any)=>{
            return SharedHelpers.CLIVersionItemValidator(argv.t, true, "package")
        }
    },
    {
        name: "forceRebuildOnNoBindings",
        details: {
            type: 'boolean'
        },
        supports: ["patchAll", "patchSpecific"]
    },
    {
        name: "shouldBackup",
        details: {
            type: 'boolean'
        },
        supports: ["patchAll", "patchSpecific"]
    },
    {
        name: "onPatchFail",
        details: {
            type: 'string',
            default: 'error',
        },
        supports: ["patchAll", "patchSpecific"],
        check:(argv:any)=>{
            if (!([ 'error', 'skip'].includes(argv.onPatchFail))){
                throw new Error(`onPatchFail can only be 'error' or 'skip'`)
            }
            return true
        }
    },
    {
        name: "onNoPrebuildsFound",
        details: {
            type: 'string',
            default: 'skip',
        },
        supports: ["patchAll", "patchSpecific"],
        check:(argv:any)=>{
            if (!(['error', 'skip'].includes(argv.onNoPrebuildsFound))){
                throw new Error(`onPatchFail can only be 'error' or 'skip'`)
            }
            return true
        }
    },
    {
        name: "projectPath",
        details: {
            type: 'string',
        },
        supports: ["revertPatches", "patchAll", "patchSpecific"]
    },
]

const loadOptions = (commandName:string, command:any) => {
    const applicableOptions = allOptions.filter((option:any) => {
        return option.supports.includes(commandName)
    })

    for (const opt of applicableOptions){
        command.option(opt.name, opt.details)
        if (opt.check){
            command.check(opt.check)
        }
    }

    return command
}

const loadPatcher = (argv:any) => {
    let pactherOptions:IPactherOptions = Object.entries({
        forceRebuildOnNoBindings: argv.forceRebuildOnNoBindings || null,
        shouldBackup: argv.shouldBackup || null,
        onPatchFail: argv.onPatchFail || null,
        onNoPrebuildsFound: argv.onNoPrebuildsFound || null,
        projectPath: argv.projectPath || null
    }).reduce((pv:any, [ck, cv])=>{
        if (cv === null){
            pv[ck] =cv
        }
        return pv
    }, {})

    return new PrebuildsPatcher(path.join(__dirname, "prebuild-manifest.json"), pactherOptions);
}

function runAsCLI(){
    yargs(hideBin(process.argv))
      .command('patchAll', 'Patch all native modules in your current project using the generated prebuilds.', (c:any) => {
            return loadOptions('patchAll', c)
      }, async (argv:any) => {
            await loadPatcher(argv).PatchAll(argv.a, argv.b, argv.t);
      })
      .command('patchSpecific', 'Similar to patchAll, but allows you to specify which package you want to patch.', (c:any) => {
            return loadOptions('patchSpecific', c)
      }, async (argv:any) => {
        await loadPatcher(argv).Patch(argv.p, argv.a, argv.b, argv.t);
      })
      .command('revertPatches', 'Revert patched native modules.', (c:any) => {
            return loadOptions('revertPatches', c)
      }, async (argv:any) => {
        await loadPatcher(argv).RevertPatchs();
      }).demandCommand(1).parse()
}

function runAsImport(){
    module.exports = new PrebuildsPatcher(path.join(__dirname, "prebuild-manifest.json"));
}


//TODO: FIME: A bit of a hack for now. Will do it properly later. 
if (process.argv[1].includes("prebuild-patcher.js")) {
    runAsCLI();
}
else {
    runAsImport();
}
