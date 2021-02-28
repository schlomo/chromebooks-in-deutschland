#!/bin/sh
find . -type f -name tf.plan -exec rm -fv "{}" ";"
terragrunt --version
terraform --version

cd ..
exec terragrunt run-all --terragrunt-log-level info --terragrunt-working-dir aws plan -out tf.plan

exec terragrunt run-all --terragrunt-log-level info plan -out tf.plan