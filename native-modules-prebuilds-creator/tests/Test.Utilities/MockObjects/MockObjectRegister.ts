import path from "path"

export const AvailableMockObjects:any = {
    SimpleNative: "SimpleNative"
}

export const MockObjectRegister:any = {
    SimpleNative: {
        srcPath: path.join(__dirname, "SimpleNative")
    }
}