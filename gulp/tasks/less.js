'use strict';

var gulp = require('gulp');
var csso = require('gulp-csso');
var fingerprint = require('gulp-fingerprint');
var less = require('gulp-less');
var size = require('gulp-size');

gulp.task('less', function () {
  return gulp.src('app/styles/main.less')
    .pipe(less({
      style: 'expanded',
      loadPath: ['node_modules']
    }))
    .pipe(gulp.dest('.tmp/styles'))
    .pipe(size());
});
