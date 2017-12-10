'use strict';

var path = require('path');
var gulp = require('gulp');
var cache = require('gulp-cache');
var changed = require('gulp-changed');
var imagemin = require('gulp-imagemin');
var rename = require('gulp-rename');
var rev = require('gulp-rev');
var size = require('gulp-size');

gulp.task('images', function () {
  return gulp.src(['app/images/**/*'], {base: path.resolve('app')})
    .pipe(imagemin())
    //.pipe(rev())
    .pipe(gulp.dest('dist/images'))
    .pipe(size())
    //.pipe(rev.manifest())
    //.pipe(rename('image-manifest.json'))
    //.pipe(gulp.dest('dist'));
});
