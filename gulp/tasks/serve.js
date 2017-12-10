'use strict';

var config = require('../config');
var gulp = require('gulp');

var browserSync = require('browser-sync').create();

gulp.task('serve', function() {
  browserSync.init({
    notify: false,
    port: config.port,
    server: {
      baseDir: ['.tmp', 'app', 'node_modules/bootstrap/dist/'],
      routes: {
        '/node_modules': 'node_modules'
      }
    }
  });

  gulp.watch([
    'app/*.html',
    'app/images/**/*',
    'app/styles/**/*',
    '.tmp/fonts/**/*'
  ]).on('change', browserSync.reload);

  gulp.watch('app/templates/**/*.dot', ['templates']);
  gulp.watch('app/styles/**/*.less', ['less']);
  gulp.watch('app/scripts/**/*.js', ['browserify']);
  gulp.watch('app/fonts/**/*', ['fonts']);
  gulp.watch('app/images/**/*', ['images']);
});

gulp.task('serve:dist', function () {
  browserSync.init({
    notify: false,
    port: config.port,
    server: {
      baseDir: ['dist']
    }
  });
});

//gulp.task('serve:test', ['scripts'], function() {
//  browserSync.init({
//    notify: false,
//    port: config.port,
//    ui: false,
//    server: {
//      baseDir: 'test',
//      routes: {
//        '/scripts': '.tmp/scripts',
//        '/node_modules': 'node_modules'
//      }
//    }
//  });
//
//  gulp.watch('app/scripts/**/*.js', ['scripts']);
//  gulp.watch(['test/spec/**/*.js', 'test/index.html']).on('change', reload);
//  gulp.watch('test/spec/**/*.js', ['lint:test']);
//});
