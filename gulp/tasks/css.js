'use strict';

var gulp = require('gulp');
var size = require('gulp-size');

gulp.task('css', function () {
  return gulp.src('app/styles/**/*.css')
    .pipe(gulp.dest('.tmp/styles'))
    .pipe(size());
});
