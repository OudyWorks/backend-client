#!/bin/sh -e

rm -rf ./npm

npm --no-git-tag-version version patch

babel source --out-dir npm -D

node -e "const package = require('./package.json'), fs = require('fs'); \
    fs.writeFileSync('./npm/package.json', JSON.stringify(package, null, 2));
"

cp -r bin npm/

cd npm && npm publish

cd ../

rm -rf ./npm