'use strict';

var gulp = require('gulp');

process.env.NODE_ENV = 'production';

gulp.task('dist', ['clean', 'build']);
