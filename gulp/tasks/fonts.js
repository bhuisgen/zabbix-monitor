'use strict';

var path = require('path');
var gulp = require('gulp');
var rename = require('gulp-rename');
var rev = require('gulp-rev');
var size = require('gulp-size');

gulp.task('fonts', function() {
	return gulp.src(['app/fonts/**/*', 'node_modules/open-iconic/font/fonts/**/*'])
    //.pipe(rev())
    .pipe(gulp.dest('dist/fonts'))
    .pipe(size())
    //.pipe(rev.manifest())
    //.pipe(rename('font-manifest.json'))
    //.pipe(gulp.dest('dist'));
});
