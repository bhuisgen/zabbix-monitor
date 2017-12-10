'use strict';

var gulp = require('gulp');

gulp.task('lint', ['jshint']);

gulp.task('lint:test', ['jshint:test']);
