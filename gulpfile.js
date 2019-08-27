const gulp = require('gulp');
const $ = require('gulp-load-plugins')();

gulp.task('clean', function() {
  return require('del')(['public']);
});

const versioncss = `

/* appended by gulp */
#version::after {
  content: "${ process.env.GIT_VERSION || "unknown GIT_VERSION" }";
}
#version:hover::after {
  content: "${ process.env.VERSION || "unknown VERSION" }";
}
`
gulp.task('build', ['clean'], function(){
  return gulp.src(['src/**'])
    .pipe($.if('*.js', $.rev()))
    .pipe($.if('style.css', $.footer(versioncss)))
    .pipe($.if('*.css', $.rev()))
    .pipe($.revReplace())
    .pipe(gulp.dest('public'));
})

gulp.task('apimocker', ['build'], function(){
  gulp.watch('src/**', ['build'])
    .on('change', function(event) {
      console.log('File ' + event.path + ' was ' + event.type + ', running tasks...');
    });
  return $.apimocker.start({
    staticDirectory: 'public',
    staticPath: '/'
  });
});

gulp.task('default', ['build']);