const
  environment = process.env.ENVIRONMENT || "dev",
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
    const git = gitDescribeSync(dir);
    if (! git.dirty && git.distance == 0) { // releases should have a plain vXX version
      version = git.tag;
    } else {
      version = git.raw;
    }
  } catch (error) {
    console.warn(error + "\n" +
                 `${dir} is not a git repository, using ${version} as version` + "\n" +
                 JSON.stringify(process.env, undefined, 2)
                );
  }
  return version;
}

if (process.env.HOME === '/builder/home') {
  console.warn(process.env); // debug env only on GCP builder
}

const version = getGitVersion();
console.log(`Version: ${version}`);
console.log(`Using environment ${environment}`);
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

function deploy(cb) {
  fb.deploy({
    project: environment,
    force: true,
  }).then(function(){
    console.log(`Deployed Firebase project to ${environment}`);
    cb();
  }).catch(function(err){
    cb(new Error(err));
  });
}
exports.deploy = series(clean, build, deploy);

exports.default = series(clean, build);