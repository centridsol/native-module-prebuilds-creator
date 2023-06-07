import path from "path"

export const AvailableMockObjects:any = {
    SimpleNative: "SimpleNative",
    BrokenNative: "BrokenNative"
}

export const MockObjectRegister:any = {
    SimpleNative: {
        srcPath: path.join(__dirname, "SimpleNative")
    },
    BrokenNative: {
        srcPath: path.join(__dirname, "BrokenNative")
    }
}