import { PackageFetcher } from "../../src/Operations/PackageFetcher"
import { PreBuildifyBuilder } from "../../src/Operations/PreBuildifyBuilder"

describe("Prebuildify builder", () => {
    it("Can build native modules", async () => {
        //let packagePaths:any = await (new PackageFetcher()).Fetch(["drivelist"])

        let packagePaths:any = {
            ["drivelist"]: {
                packagePath: "/tmp/nm-prebuilds-creator/drivelist/package/",
                nativeBuildPaths: null
            }
        }

        packagePaths = await (new PreBuildifyBuilder(packagePaths)).BuildAll({
            arch: "x64",
            platform: "linux",
            // @ts-ignore
            //napi: true,
            targets: ["node@20.0.0", "node@16.0.0", "node@14.0.0"]
        })

        
    }, 60000)
})