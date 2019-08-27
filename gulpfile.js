const outDir = "public";
const gulp = require('gulp');
const { series, src, watch } = require('gulp');
const $ = require('gulp-load-plugins')();
const fb = require('firebase-tools');

function clean() {
  return require('del')([outDir]);
}


const versioncss = `

/* appended by gulp */
#version::after {
  content: " (${ process.env.GIT_VERSION || "unknown GIT_VERSION" })";
}

#version:hover::after {
  content: "${ process.env.VERSION || "unknown VERSION" }";
}

`
function build() {
  return gulp.src(['src/**'])
    .pipe($.if('*.js', $.rev()))
    .pipe($.if('style.css', $.footer(versioncss)))
    .pipe($.if('*.css', $.rev()))
    .pipe($.revReplace())
    .pipe(gulp.dest(outDir));
}
exports.build = series(clean, build);

function dev(cb) {
  var watcher = watch('src/**', gulp.series(clean, build));
  watcher.on('all', function(action, path) {
      console.log('Watcher ' + path + ' (' + action + ')');
    });
  // seems to work but needs double Ctrl-C to terminate
  fb.serve({port:5000}).then(function(){
    watcher.close();
    cb();
  }).catch(function(err){
    watcher.close();
    cb(new Error(err));
  });
}
exports.dev = series(clean, build, dev);

exports.default = series(clean, build);