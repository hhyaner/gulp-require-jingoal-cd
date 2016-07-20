var nodejsPath = require("upath");
/*
@param fileName 当前文件名
@param moduleName 模块名
*/
function getModulePath(fileName,moduleName,config){
    var replaced = false;
    if((moduleName.indexOf("./")==0||moduleName.indexOf("../")==0)&&moduleName.indexOf("/")!=0){
        var moduleFilePath = fileName +"/"+ moduleName;
    }else{
        for(var i in config.modulePath){
            if(replaced){
                break;
            }
            var pathsReg = new RegExp("^" + i);
            if(pathsReg.test(moduleName)){
                replaced = true;
                moduleName = moduleName.replace(pathsReg,config.modulePath[i]);
            }
        }
        var moduleFilePath = config.basePath +"/" +moduleName;
    }
    if(!/(css|js|tpl)$/.test(nodejsPath.extname(moduleFilePath))){
        moduleFilePath = moduleFilePath+".js";
    }
    return nodejsPath.normalize(moduleFilePath);
}
module.exports = getModulePath;
