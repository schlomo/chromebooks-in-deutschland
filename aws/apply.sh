#!/bin/sh
terragrunt --version
terraform --version
exec terragrunt run-all --terragrunt-non-interactive --terragrunt-log-level info apply tf.plan