'use strict';

var gulp = require('gulp');
var gulpif = require('gulp-if');
var csso = require('gulp-csso');
var htmlmin = require('gulp-htmlmin');
var rev = require('gulp-rev');
var size = require('gulp-size');
var uglify = require('gulp-uglify');
var useref = require('gulp-useref');

gulp.task('build', ['env:dist', 'templates', 'styles', 'browserify', 'fonts', 'images'], function() {
  return gulp.src('app/*.html')
    .pipe(useref({searchPath: ['.tmp', 'app', '.']}))
    .pipe(gulpif('*.js', uglify()))
    .pipe(gulpif('*.css', csso()))
    .pipe(gulpif('*.html', htmlmin({
      collapseWhitespace: true,
      minifyCSS: true,
      minifyJS: {compress: {drop_console: true}},
      processConditionalComments: true,
      removeComments: true,
      removeEmptyAttributes: true,
      removeScriptTypeAttributes: true,
      removeStyleLinkTypeAttributes: true
    })))
    .pipe(size({title: 'build', gzip: true}))
    .pipe(gulp.dest('dist'));
});
