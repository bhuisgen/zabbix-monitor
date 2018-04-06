'use strict';

var gulp = require('gulp');

gulp.task('dev', ['env', 'templates', 'styles', 'browserify', 'serve']);
