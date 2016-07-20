var getModules = require("./get-modules");
var getModulePath = require("./get-module-path");
var nodejsPath = require("upath");
var fs = require("fs");
var defineReg = /define\s*\((\s*function\s*\(|\[[^\)\]]*\]\s*,\s*function\s*\()/g;
var parsedDefineReg = /define\('([^']+)',/g;
var parsedFiles = {};
function handleFile(fileName,sourcefile,config){
    //获取添加模块名的文件内容
    var moduleContent = getParsedFile(fileName,config),
        depContent;//依赖的内容,如果是通过分析依赖递归调用这个文件的话
    //获取所有模块
    var depModules = getModules(fileName,config);
    //只把需要同步的模块合并过来
    depModules.syncModules.forEach(function(value){
        //获取依赖文件的真是路径
        var depfilepath = getModulePath(nodejsPath.dirname(fileName),value,config);
        moduleContent += ";"+handleFile(depfilepath,sourcefile,config).depContent;
    });
    /*
    depModules.ayncModules.forEach(function(value){//对于异步加载模块，只需要移动就好了
        handleFile(getModulePath(nodejsPath.dirname(fileName),value),{type:"requireAync"});
    });
    */
    depContent = moduleContent;
    //如果是入口文件，就直接返回
    if(!isNoMergeFile(fileName,sourcefile,config)){
        depContent = "";
    }
    moduleContent = removeRepeatModule(moduleContent);
    return {
        moduleContent:moduleContent,
        depContent:depContent
    };
}
module.exports = handleFile;
//在这里去除重复模块
function removeRepeatModule(moduleContent){
    var modules = {};
    moduleContent = moduleContent.replace(parsedDefineReg, function(base,r1,r2){
        if(typeof modules[r1] == "undefined") {
            modules[r1] = 1;
        } else {
            modules[r1] = modules[r1]+1;
        }

        return base;
    });
    for(var module in modules) {
        if(modules[module]>1){
            for(var i=1;i<modules[module];i++){
                moduleContent = moduleContent.replace(parsedFiles[module],"");
            }
        }

    }
    return moduleContent;
}
//分析文件名
/*
两个参数, 这个文件是通过那个文件分析来的,如果是public下面同级1级目录,当然要合并
*/
function isNoMergeFile(fileName,sourcefile,config){
    if(nodejsPath.extname(fileName) == '.tpl') {
        return true;
    }
    /*
    两种种情况要直接移动
    在不能合并目录规则中,比如说public,除了在public里面的同1级目录里面的文件,也需要合并,其他public非1级目录里面的文件都不能合并
    没有define模块
    */
    var isToMerge = false;
    config.noMergePath.forEach(function(value){
        //如果是在public里面
        if(fileName.indexOf(value)==0){
            //并且和源文件不是同一个目录,就不需要移动
            if(sourcefile.indexOf(value)==0){
                var sourcePath = sourcefile.replace(value+"/","");
                var filePath = fileName.replace(value+"/","");
                sourcePath = sourcePath.substring(0,sourcePath.indexOf("/"));
                filePath = filePath.substring(0,filePath.indexOf("/"));
                //两个一样1级public目录,那么就要合并
                if(sourcePath == filePath) {
                    isToMerge = true;
                }
            }
        }else{//如果不在public 里面,那么就要合并
            isToMerge = true;
        }
    });
    if(isToMerge) { //如果要合并,但是没有define模块的话,就不能合并
        //没有define模块
        var fileContent = fs.readFileSync(fileName).toString();
        defineReg.lastIndex = 0;
        if(!defineReg.test(fileContent)){
            isToMerge = false;
        }
    }
    return isToMerge;
}
//获取添加模块名后的文件内容
function getParsedFile(fileName,config){
    /**
     * 先把require('ltpl!...') 换成 require('...')
     * 然后将模板文件 加上define包裹
     */
    var fileContent = fs.readFileSync(fileName).toString();
    fileContent = fileContent.replace(/('|")ltpl!([^'"]+)\1/g,"'$2'");
    var moduleName = fileNameToModuleName(fileName,config);
    if(nodejsPath.extname(fileName) == '.tpl') {
        fileContent = "define('"+ moduleName +"',function(){utils.loadTtpl(function(){/*loadText*" + fileContent + "loadTextEnd*/});});";
    }else{
        defineReg.lastIndex=0;
        fileContent = fileContent.replace(defineReg,"define('"+ moduleName +"',$1");
        //将所有处理后的模块内容都保存起来,有用
        parsedFiles[moduleName] = fileContent;
    }
    return fileContent;
}

function fileNameToModuleName(fileName,config){
    var moduleName = fileName.substring(0,fileName.lastIndexOf("."));
    if(moduleName.indexOf(config.basePath) === 0){
        moduleName = moduleName.replace(config.basePath+"/", "");
    }else{
        for(var i in config.reversionPath){
            if(moduleName.indexOf(i)==0){
                moduleName = moduleName.replace(i, config.reversionPath[i]);
                break;
            }
        }
    }
    return moduleName;
}