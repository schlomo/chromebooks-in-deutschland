#!/bin/sh
find . -type f -name tf.plan -exec rm -fv "{}" ";"
terragrunt --version
terraform --version
exec terragrunt plan --terragrunt-log-level info -out tf.plan