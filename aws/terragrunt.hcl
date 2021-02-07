skip = true

generate "base" {
  path = "_base.tf"
  if_exists = "overwrite_terragrunt"
  contents = <<EOF
terraform {
  backend "s3" {
    bucket = "9826119742-state"
    key    = "chromebooks-in-deutschland/${path_relative_to_include()}/terraform.tfstate"
    region = "eu-central-1"
  }
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 2.70"
    }
  }
}

provider "aws" {
  profile = "default"
  region  = "eu-central-1"
}
EOF
}

inputs = {
  base_dir = "${get_parent_terragrunt_dir()}/.."
}