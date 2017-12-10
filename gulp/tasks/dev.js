'use strict';

var gulp = require('gulp');

gulp.task('dev', ['clean', 'env', 'templates', 'styles', 'browserify', 'serve']);
