'use strict';

var gulp = require('gulp');
var debug = require('gulp-debug');
var browserify = require('browserify');
var envify = require('envify/custom');
var partialify = require('partialify');
var rename = require('gulp-rename');
var rev = require('gulp-rev');
var source = require('vinyl-source-stream');

gulp.task('browserify', ['templates', 'styles'], function() {
  return browserify({
    debug: true,
    ignoreMissing: ['config']
    })
    .add('app/scripts/app.js')
    .require('.tmp/scripts/templates.js', {expose: './templates'})
    .transform(envify())
    .transform(partialify)
    .bundle()
    .pipe(source('main.js'))
    .pipe(gulp.dest('.tmp/scripts/'));
});
