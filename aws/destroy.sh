#!/bin/sh
terragrunt --version
terraform --version
cid_hostname=aws
cid_domain=chromebooks-in-deutschland.de
aws s3 rm s3://38456734875-$cid_hostname.$cid_domain/api/data
exec terragrunt destroy --terragrunt-non-interactive --terragrunt-log-level info