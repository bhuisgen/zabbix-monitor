'use strict';

var gulp = require('gulp');
var rimraf = require('gulp-rimraf');

gulp.task('clean', function () {
    return gulp.src(['.tmp', 'dist'],{read: false}).pipe(rimraf());
});
