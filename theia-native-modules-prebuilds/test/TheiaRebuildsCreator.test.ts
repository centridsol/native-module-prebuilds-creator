import { TheiaPrebuildsCreator } from "../src/TheiaPrebuildsCreator"

describe("Prebuilds creator tests", () => {
    let prebuildCreatorInstance:TheiaPrebuildsCreator

    beforeAll(()=>{
        prebuildCreatorInstance =  new TheiaPrebuildsCreator()
    })
    it("Can let require native modules", () => {
        expect(prebuildCreatorInstance["GetNativeModules"]()).toEqual(
            ["node-pty@0.11.0-beta17", 
            "nsfw@2.2.4", 
            "native-keymap@2.5.0", 
            "find-git-repositories@0.1.3", 
            "drivelist@9.2.4"])
    })

    it("Can create prebuilds", async () => {
        await prebuildCreatorInstance.Create()
        // expect(prebuildCreatorInstance["GetNativeModules"]()).toEqual(
        //     ["node-pty@0.11.0-beta17", 
        //     "nsfw@2.2.4", 
        //     "native-keymap@2.5.0", 
        //     "find-git-repositories@0.1.3", 
        //     "drivelist@9.2.4"])
    }, 300000)
})