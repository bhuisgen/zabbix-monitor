'use strict';

var concat = require('gulp-concat');
var dot = require('gulp-dotjs-compiler');
var gulp = require('gulp');
var footer = require('gulp-footer');
var header = require('gulp-header');
var size = require('gulp-size');

gulp.task('dot', function () {
  return gulp.src('app/templates/**/*.dot')
    .pipe(dot({
      ext: 'dot',
      dict: 'tmpl'
    }))
    .pipe(concat('templates.js'))
    .pipe(header('var tmpl = {};'))
    .pipe(header('\'use strict\';'))
    .pipe(footer('module.exports = tmpl;'))
    .pipe(gulp.dest('.tmp/scripts'))
    .pipe(size());
});
