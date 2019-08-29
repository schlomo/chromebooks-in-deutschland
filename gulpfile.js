const
  outDir = "public",
  { series, src, dest, watch } = require('gulp'),
  $ = require('gulp-load-plugins')(),
  fb = require('firebase-tools'),
  { gitDescribeSync } = require('git-describe')
  ;

function getGitVersion(fallback="not-git-repo-and-VERSION-not-set") {
  var version = process.env.VERSION || fallback;
  var dir = __dirname;
  try {
    version = gitDescribeSync(dir).raw;
  } catch (error) {
    console.warn(`${dir} is not a git repository, using ${version} as version`)
    console.warn(process.env);
  }
  return version;
}


const version = getGitVersion();
console.log(`Version: ${version}`);
const versioncss = `

/* appended by gulp */
#version::after {
  content: " ${version}";
}


#version:hover::after {
  content: " ${ new Date().toISOString() }";
}

`

function clean(cb) {
  return require('del')([outDir], cb);
}

function build() {
  return src(['src/**'])
  .pipe($.if('*.js', $.rev()))
    .pipe($.if('style.css', $.footer(versioncss)))
    .pipe($.if('*.css', $.rev()))
    .pipe($.revReplace())
    .pipe(dest(outDir));
}
exports.build = series(clean, build);

function dev(cb) {
  var watcher = watch('src/**', series(clean, build));
  watcher.on('all', function(action, path) {
      console.log('Trigger rebuild for ' + path + ' (' + action + ')');
    });
  console.log("Starting reloading development webserver on port 5000, press CTRL-C to quit");
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