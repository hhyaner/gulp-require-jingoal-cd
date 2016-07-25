###使用方法
/*requirejs 打包*/
var pack = require("gulp-require-jingoal-cd");
gulp.task('requirejs',function () {
    gulp.src('../static/**/*.*').pipe(pack('static')).pipe(gulp.dest('../dest/static'))
    gulp.src('../public/**/*.*').pipe(pack('static')).pipe(gulp.dest('../dest/public'));
});