'use strict';

module.exports = function(grunt) {
  require('time-grunt')(grunt);
  require('jit-grunt')(grunt, {
    dot: 'grunt-dot-compiler',
    useminPrepare: 'grunt-usemin'
  });

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    bowerrc: grunt.file.readJSON('.bowerrc'),

    config: {
      app: 'app',
      dist: 'dist',
      vendor: '<%= bowerrc.directory %>',
      node: 'node_modules'
    },

    banner: '/*!\n' +
            ' * <%= pkg.name %>-<%= pkg.version %>\n' +
            ' * <%= pkg.author %>\n' +
            ' * <%= grunt.template.today("yyyy-mm-dd") %>\n' +
            ' */\n\n',

    watch: {
      bower: {
        files: ['bower.json'],
        tasks: ['wiredep']
      },
      gruntfile: {
        files: ['Gruntfile.js']
      },
      js: {
        files: ['<%= config.app %>/scripts/{,*/}*.js'],
        tasks: ['eslint', 'browserify']
      },
      jstest: {
        files: ['test/spec/{,*/}*.js'],
        tasks: ['babel:test', 'test:watch']
      },
      less: {
        files: ['<%= config.app %>/less/{,*/}*.less'],
        tasks: ['less', 'autoprefixer']
      },
      styles: {
        files: ['<%= config.app %>/styles/{,*/}*.css'],
        tasks: ['newer:copy:styles', 'autoprefixer']
      },
      templates: {
        files: ['<%= config.app %>/templates/{,*/}*.dotjs'],
        tasks: ['dot']
      }
    },

    browserSync: {
      options: {
        notify: false,
        background: true,
        watchOptions: {
          ignored: ''
        }
      },
      livereload: {
        options: {
          files: [
            '<%= config.app %>/{,*/}*.html',
            '.tmp/styles/{,*/}*.css',
            '<%= config.app %>/images/{,*/}*',
            '.tmp/scripts/{,*/}*.js'
          ],
          port: 9000,
          open: false,
          server: {
            baseDir: ['.tmp', '<%= config.app %>' ],
            routes: {
              '/bower_components': './bower_components'
            }
          }
        }
      },
      test: {
        options: {
          port: 9001,
          open: false,
          logLevel: 'silent',
          host: 'localhost',
          server: {
            baseDir: ['.tmp', './test', '<%= config.app %>'],
            routes: {
              '/bower_components': './bower_components'
            }
          }
        }
      },
      dist: {
        options: {
          background: false,
          server: '<%= config.dist %>'
        }
      }
    },

    clean: {
      dist: {
        files: [{
          dot: true,
          src: [
            '.tmp',
            '<%= config.dist %>/*',
            '!<%= config.dist %>/.git*'
          ]
        }]
      },
      server: '.tmp'
    },

    eslint: {
      options: {
        quiet: true
      },
      target: [
        'Gruntfile.js',
        '<%= config.app %>/scripts/{,*/}*.js',
        '!<%= config.app %>/scripts/templates.js',
        '!<%= config.app %>/scripts/vendor/*',
        'test/spec/{,*/}*.js'
      ]
    },

    mocha: {
      all: {
        options: {
          run: true,
          urls: ['http://<%= browserSync.test.options.host %>:<%= browserSync.test.options.port %>/index.html']
        }
      }
    },

    dot: {
      templates: {
        options: {
          variable: 'templates',
          root: __dirname + '/app/templates',
          node: true
        },
        src: ['app/templates/{,*/}*.dotjs'],
        dest: 'app/scripts/templates.js'
      }
    },

    less: {
      options: {
        compile: true,
        banner: '<%= banner %>'
      },
      dev: {
        src: ['<%= config.app %>/less/app.less'],
        dest: '.tmp/styles/app.css'
      },
      min: {
        options: {
          compress: true
        },
        src: ['<%= config.app %>/less/app.less'],
        dest: '<%= config.dist %>/styles/app.min.css'
      }
    },

    browserify: {
      vendor: {
        src: [],
        dest: '.tmp/scripts/vendor.js',
        options: {
          debug: false
        }
      },
      dev: {
        src: ['<%= config.app %>/scripts/main.js'],
        dest: '.tmp/scripts/main.js',
        options: {
          debug: true
        }
      },
      test: {
        src: ['test/{,*/}*.js'],
        dest: '.tmp/test/test.js',
        options: {
          debug: true
        }
      }
    },

    autoprefixer: {
      options: {
        browsers: ['last 1 version']
      },
      dist: {
        files: [{
          expand: true,
          cwd: '.tmp/styles/',
          src: '{,*/}*.css',
          dest: '.tmp/styles/'
        }]
      }
    },

    concat: {
      options: {
        banner: '<%= banner %>'
      },
      dev: {
        src: ['.tmp/scripts/vendor.js', '.tmp/scripts/main.js'],
        dest: '.tmp/scripts/app.js'
      },
      dist: {
        src: ['.tmp/scripts/vendor.js', '.tmp/scripts/main.js'],
        dest: '.tmp/scripts/app.js'
      }
    },
    // not used since Uglify task does concat,
    // but still available if needed
    /*concat: {
      dist: {}
    },*/
    // not enabled since usemin task does concat and uglify
    // check index.html to edit your build targets
    // enable this task if you prefer defining your build targets here
    /*uglify: {
      dist: {}
    },*/

    wiredep: {
      app: {
        src: '<%= config.app %>/index.html',
        ignorePath: '<%= config.app %>/'
      }
    },

    rev: {
      dist: {
        files: {
          src: [
            '<%= config.dist %>/scripts/{,*/}*.js',
            '<%= config.dist %>/styles/{,*/}*.css',
            '<%= config.dist %>/images/{,*/}*.*',
            '<%= config.dist %>/styles/fonts/{,*/}*.*',
            '<%= config.dist %>/*.{ico,png}'
          ]
        }
      }
    },

    useminPrepare: {
      options: {
        dest: '<%= config.dist %>'
      },
      html: '<%= config.app %>/index.html'
    },

    usemin: {
      options: {
        assetsDirs: ['<%= config.dist %>', '<%= config.dist %>/images']
      },
      html: ['<%= config.dist %>/{,*/}*.html'],
      css: ['<%= config.dist %>/styles/{,*/}*.css']
    },

    imagemin: {
      dist: {
        files: [{
          expand: true,
          cwd: '<%= config.app %>/images',
          src: '{,*/}*.{gif,jpeg,jpg,png}',
          dest: '<%= config.dist %>/images'
        }]
      }
    },

    svgmin: {
      dist: {
        files: [{
          expand: true,
          cwd: '<%= config.app %>/images',
          src: '{,*/}*.svg',
          dest: '<%= config.dist %>/images'
        }]
      }
    },

    cssmin: {
      // This task is pre-configured if you do not wish to use Usemin
      // blocks for your CSS. By default, the Usemin block from your
      // `index.html` will take care of minification, e.g.
      //
      //     <!-- build:css({.tmp,app}) styles/main.css -->
      //
      // dist: {
      //     files: {
      //         '/styles/main.css': [
      //             '.tmp/styles/{,*/}*.css',
      //             '/styles/{,*/}*.css'
      //         ]
      //     }
      // }
    },

    htmlmin: {
      dist: {
        options: {
          /*removeCommentsFromCDATA: true,
          // https://github.com/yeoman/grunt-usemin/issues/44
          //collapseWhitespace: true,
          collapseBooleanAttributes: true,
          removeAttributeQuotes: true,
          removeRedundantAttributes: true,
          useShortDoctype: true,
          removeEmptyAttributes: true,
          removeOptionalTags: true*/
        },
        files: [{
          expand: true,
          cwd: '<%= config.app %>',
          src: '*.html',
          dest: '<%= config.dist %>'
        }]
      }
    },

    copy: {
      dist: {
        files: [{
          expand: true,
          dot: true,
          cwd: '<%= config.app %>',
          dest: '<%= config.dist %>',
          src: [
            '*.{ico,png,txt}',
            '.htaccess',
            'images/{,*/}*.webp'
          ]
        }, {
          expand: true,
          dot: true,
          cwd: './bower_components/bootstrap/dist',
          src: ['fonts/*.*'],
          dest: '<%= config.dist %>'
        }]
      },
      styles: {
        expand: true,
        dot: true,
        cwd: '<%= config.app %>/styles',
        dest: '.tmp/styles/',
        src: '{,*/}*.css'
      },
      fonts: {
        expand: true,
        dot: true,
        cwd: './bower_components/bootstrap/dist/fonts',
        dest: '.tmp/fonts/',
        src: [
          '<%= config.app %>/styles/fonts/{,*/}*.*',
          'bower_components/bootstrap/dist/fonts/{,*/}*.*'
        ]
      }
    },

    concurrent: {
      server: [
        'less:dev',
        'browserify:dev',
        'browserify:vendor',
        'copy:styles',
        'copy:fonts'
      ],
      test: [
        'copy:styles',
        'copy:fonts',
        'eslint',
        'browserify:vendor',
        'browserify:dev',
        'browserify:test'
      ],
      dist: [
        'less',
        'browserify',
        'copy:styles',
        'copy:fonts',
        'imagemin',
        'svgmin',
        'htmlmin'
      ]
    }
  });

  grunt.registerTask('build', [
    'clean:dist',
    'wiredep',
    'dot',
    'useminPrepare',
    'concurrent:dist',
    'autoprefixer',
    'concat',
    'cssmin',
    'uglify',
    'copy:dist',
    'rev',
    'usemin'
  ]);

  grunt.registerTask('lint', [
    'eslint'
  ]);

  grunt.registerTask('serve', function(target) {
    if (target === 'dist') {
      return grunt.task.run(['build', 'browserSync:dist']);
    }

    grunt.task.run([
      'clean:server',
      'wiredep',
      'dot',
      'concurrent:server',
      'concat:dev',
      'autoprefixer',
      'browserSync:livereload',
      'watch'
    ]);
  });

  grunt.registerTask('server', function() {
    grunt.log.warn('The `server` task has been deprecated. Use `grunt serve` to start a server.');
    grunt.task.run(['serve']);
  });

  grunt.registerTask('test', [
    'clean:server',
    'concurrent:test',
    'autoprefixer',
    'browserSync:test',
    'mocha',
    'watch'
  ]);

  grunt.registerTask('default', [
    'newer:eslint',
    'test',
    'build'
  ]);
};
