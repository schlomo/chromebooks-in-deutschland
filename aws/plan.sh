#!/bin/sh
find . -type f -name tf.plan -exec rm -fv "{}" ";"
terragrunt --version
terraform --version

cd ..
exec terragrunt plan --terragrunt-log-level info --terragrunt-working-dir aws -out tf.plan