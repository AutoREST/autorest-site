var gulp = require('gulp');
var del = require('del');

var buildDir = 'build/Release/';

gulp.task('jquery', function() {
	var stream = gulp.src('./bower_components/jquery/dist/*.js')
	.pipe(gulp.dest(buildDir + 'js/jquery'));
	return stream;
});
gulp.task('angular-js', function() {
	var stream = gulp.src('./bower_components/angular*/*.js')
	.pipe(gulp.dest(buildDir + 'js'));
	return stream;
});
gulp.task('angular-css', function() {
	var stream = gulp.src('./bower_components/angular*/*.css')
	.pipe(gulp.dest(buildDir + 'css'));
	return stream;
});
gulp.task('bootstrap', function() {
	var stream = gulp.src(['./bower_components/bootstrap/dist/**/*.*'])
	.pipe(gulp.dest(buildDir));
	return stream;
});
gulp.task('clean', function() {
	return del([buildDir]);
})
gulp.task('default', ['jquery', 'angular-js', 'angular-css', 'bootstrap']);
