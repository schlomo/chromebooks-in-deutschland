#!/bin/sh
find . -type f -name tf.plan -exec rm -fv "{}" ";"
terragrunt --version
terraform --version
exec terragrunt run-all --terragrunt-log-level info plan -out tf.plan