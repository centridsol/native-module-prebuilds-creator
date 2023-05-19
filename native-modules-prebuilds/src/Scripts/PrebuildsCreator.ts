export class PrebuildsCreator{
    constructor(projectRoot:string, theiaVersion:string,  addtionalPackagestoBuild:string[], targets:){
       
    }

    Create(){
        GetTheiaNativeDependencies(projectRoot, theiaVersion)
        CreatePrebuilds(dpendencies)
    }
    
}
CreatePreBuikd(){
    //TOOD: log platform....linux, and tagets
    // metat - version, name
}

class TheiaNativeDependencies{

    private theiaProject:any =null

    GetDependencies(projectRoot:string, theiaVersion:string,){
        if (projectRoot != null)
        {
            this.theiaProject = this.TryGetFromProjectRoot(projectRoot)
        }

        if (this.theiaProject == null){
            this.theiaProject = this.GetFromInstallation(thiaVErsion)
        }

        if (this.theiaProject == null){
            // log Error
            return //staticversion
        }

    }

    TryGetFromProjectRoot(projectRoot:string){
        try {
            // if dile exites
            const theiaProject = require.resolve(path.join(projectRoot, Consts.THEIA_APP_MANAGER_REBULDS_NAME)) // @theia/application-manager/rebuilds
            if (theiaProject)
                this.node_nodePathToUse = projectRoot
        }
    }
}