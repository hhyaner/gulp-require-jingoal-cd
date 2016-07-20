//格式化配置
var parseConfig = require("./parse-config.js");
//处理文件
var handleFile = require("./handle-file.js");
//格式化要合并的文件
var getModulePath = require("./get-module-path.js");
//压缩文件
var UglifyJS = require("uglify-js");
var fs = require("fs");

//获取入口文件
//var mainJs = getModulePath(config.basePath, config.mainJs);
//处理入口文件，该合并合并，该移动移动
//fs.writeFile("d://data.txt",handFile(mainJs,{type:"enterFile"}));
//处理移动目录，把目录中所有模块文件进行命名

// through2 是一个对 node 的 transform streams 简单封装
var through = require('through2');
var gutil = require('gulp-util');
var nodejsPath = require('upath');
var PluginError = gutil.PluginError;
// 插件级别函数 (处理文件)
function packFile(rootPath,basePath) {
    //格式化不需要合并的文件
    var config = {
        rootPath:rootPath,
        basePath:basePath+"/js",
        mainJs:"load",
        asncRequire:"requireAync",
        noMergePath:["public"],
        modulePath:{
            ltpl: '../../public/requirejs/ltpl',
            lcss: '../../public/requirejs/lcss',
            angular: '../../public/angular',
            tpl: '../tpl',
            public: '../../public',
            mockData:"../../mock-data"
        },
        preloadFile:[//预加载的文件，这些文件通过分析入口文件分析不出来
            "angular/ie78/angular.min",
            "angular/ie78/angular.route"
        ]
    };
    //获取配置
    config = parseConfig(config);
    global.movedFiles = [];//已经移动过的文件,就不要在移动了
    // 创建一个让每个文件通过的 stream 通道
    return through.obj(function(file, enc, cb) {
    var extName = nodejsPath.extname(file.path);
        switch(extName){
            case ".js":{
                var filePath = nodejsPath.normalize(file.path);
                var moduleContent = handleFile(filePath,filePath,config).moduleContent;
                console.log(file.path+"---"+"start");
                if(file.path.indexOf("angular")==-1&&file.path.indexOf("ckeditor")==-1){
                    try{
                        moduleContent = minify_js(moduleContent);
                    }catch(e){
                        console.log(filePath);
                        console.log(e.toString());
                    }

                }
                console.log(file.path+"---"+"ok");
                file.contents=new Buffer(moduleContent);
        }
    }
    cb(null,file);
  });
};
module.exports = packFile;
//压缩js的工具
function minify_js(content){
    //对于通过注释进行加载文本文件的地方的进行特殊处理
    content=content.replace(/\(function\s*\(\s*\)\s*{\s*(\/\*loadText\*[\s\S]+?\*\/)\s*\}\)/g,function(base,r1){
        return "(function(){eval(\"var a='a'\");"
        +r1+
        "eval(\"var a='a'\");})"
    });
    content = UglifyJS.minify(content,{
        fromString: true,
        mangle:false,
        output:{
            comments:function(node,comments){
                if(/loadText\*[\s\S]+/g.test(comments.value)){
                    return true;
                }
                return false;
            }
        }
    }).code;
    return content;
}
