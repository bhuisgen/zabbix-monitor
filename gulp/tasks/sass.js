'use strict';

var gulp = require('gulp');
var sass = require('gulp-sass');
var size = require('gulp-size');

gulp.task('sass', function () {
  return gulp.src('app/styles/app.scss')
    .pipe(sass())
    .pipe(gulp.dest('.tmp/styles'))
    .pipe(size());
});
