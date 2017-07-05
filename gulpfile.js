var gulp = require('gulp');
var del = require('del');
var merge = require('merge-stream');
var path = require('path');

var buildDir = 'build/Release/';

gulp.task('client', function() {
	var stream = gulp.src(['./client/**/*.js', './client/**/*.css'])
	.pipe(gulp.dest(buildDir));
	return stream;
});
gulp.task('jquery', function() {
	var stream = gulp.src('./bower_components/jquery/dist/*.js')
	.pipe(gulp.dest(buildDir + 'js/jquery'));
	return stream;
});
gulp.task('bootstrap', function() {
	var stream = gulp.src(['./bower_components/bootstrap/dist/**/*.*'])
	.pipe(gulp.dest(buildDir));
	return stream;
});
gulp.task('angular', function() {
	var angularCss = gulp.src('./bower_components/angular*/*.css')
		.pipe(gulp.dest(path.join(buildDir,'css')));
	var angularJs = gulp.src('./bower_components/angular*/*.js')
		.pipe(gulp.dest(path.join(buildDir,'js')));
	var angBlockJs = gulp.src('./bower_components/angular-block-ui/dist/*.js')
		.pipe(gulp.dest(path.join(buildDir,'js')));
	var angBlockCss = gulp.src('./bower_components/angular-block-ui/dist/*.css')
		.pipe(gulp.dest(path.join(buildDir,'css')));
	return merge(angularJs,merge(angularCss,merge(angBlockJs, angBlockCss)));
});
gulp.task('clean', function() {
	return del([buildDir]);
})
gulp.task('default', ['client', 'jquery', 'angular', 'bootstrap']);
