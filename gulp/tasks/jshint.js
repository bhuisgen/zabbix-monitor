'use strict';

var gulp = require('gulp');
var jshint = require('gulp-jshint');

gulp.task('jshint', function () {
  return gulp.src('app/scripts/**/*.js')
    .pipe(jshint('.jshintrc'))
    .pipe(jshint.reporter(require('jshint-stylish')));
});

gulp.task('jshint:test', function () {
  return gulp.src('test/spec/**/*.js')
    .pipe(jshint('.jshintrc'))
    .pipe(jshint.reporter(require('jshint-stylish')));
});
