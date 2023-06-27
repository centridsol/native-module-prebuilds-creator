#!/usr/bin/env node
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import { PrebuildsCreator } from "./PrebuildsCreator"
import { Helpers } from './Utilities/Helpers'

const parsedArgs:any = yargs(hideBin(process.argv)).option('packages', {
    alias: 'p',
    type: 'string',
    description: 'Comma separated native node packages you want to create prebuilds for. eg "mynativemodule1@1.0.0,mynativemodule@2.0.0" ',
    required: true
}).check((argv:any)=>{
    return Helpers.CLIVersionItemValidator(argv.p, false, "package")
}).option('arch', {
    alias: 'a',
    type: 'string',
    description: 'Target Architecture',
    required: true
}).option('platform', {
    alias: 'b',
    type: 'string',
    description: 'Target Platform',
    required: true
}).option('targets', {
    alias: 't',
    type: 'string',
    description: 'One or more targets. e.g "node@20.0.0,electron@25.0.0"',
    required: true
}).check((argv:any)=>{
    return Helpers.CLIVersionItemValidator(argv.t, true, "target")
}).option('out', {
    alias: 'o',
    type: 'string',
    description: 'Output path for the generated prebuilds folder',
}).option('onUnsupportedTargets', {
    type: 'string',
    description: 'What to do when a target not supported. (skip, error or force)',
}).check((argv:any)=>{
    if (argv.onUnsupportedTargets){
        if (!(['skip', 'error', 'force'].includes(argv.onUnsupportedTargets))){
            throw new Error(`onUnsupportedTargets can only be 'skip', 'error' or 'force'`)
        }
    }
    return true
}).parse()

new PrebuildsCreator({
        arch: parsedArgs.arch,
        platform: parsedArgs.platform,
        targets: parsedArgs.targets.split(",").map((t:string)=>{
            const tD = t.split("@")
            return {
                runtime: tD[0],
                target: tD[1]
            }
        }),
        onUnsupportedTargets: parsedArgs.onUnsupportedTargets
    }, 
    parsedArgs.packages.split(","),
    parsedArgs.out
).Create()