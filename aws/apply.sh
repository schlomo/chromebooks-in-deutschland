#!/bin/sh
terragrunt --version
terraform --version
exec terragrunt apply --terragrunt-non-interactive --terragrunt-log-level info tf.plan