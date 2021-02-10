skip = true

locals {
  region = "eu-central-1"
  www_domain_name = "aws.chromebooks-in-deutschland.de"
  root_domain_name = "chromebooks-in-deutschland.de"
}

generate "base" {
  path = "_base.tf"
  if_exists = "overwrite_terragrunt"
  contents = <<EOF
terraform {
  backend "s3" {
    bucket = "9826119742-state"
    key    = "chromebooks-in-deutschland/${path_relative_to_include()}/terraform.tfstate"
    region = "${local.region}"
  }
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 2.70"
    }
  }
}

provider "aws" {
  region  = "${local.region}"
}
provider "aws" {
  region  = "us-east-1"
  alias = "aws_us"
}
EOF
}

inputs = {
  base_dir = "${get_parent_terragrunt_dir()}/.."
}