'use strict';

var gulp = require('gulp');

gulp.task('env', function() {
    return process.env.NODE_ENV = 'development';
});

gulp.task('env:dist', function() {
    return process.env.NODE_ENV = 'production';
});
