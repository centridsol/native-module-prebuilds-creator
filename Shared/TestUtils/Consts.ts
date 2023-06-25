import path from "path"

export default class TestConsts{
    static BACKUP_DIR_NAME(BACKUP_DIR_NAME: any) {
        throw new Error("Method not implemented.")
    }
    static testTempDir = path.join(__dirname, "../../temp")
}