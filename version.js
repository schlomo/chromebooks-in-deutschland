const
  outputFile = "version.css",
  { gitDescribeSync } = require("git-describe"),
  { writeFile } = require("fs")
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
const versioncss = `

/* appended by version.js */
#version::after {
  content: " ${version}";
}

#version:hover::after {
  content: " ${ new Date().toISOString() }";
}

`
writeFile(outputFile, versioncss, (err) => {
    if (err) throw err;
    console.log(`Set ${version} in >${outputFile}<`);
  });