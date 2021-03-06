remote_state {
  backend = "s3"
  config = {
    bucket         = "9826119742-state"
    key            = "chromebooks-in-deutschland/${path_relative_to_include()}/terraform.tfstate"
    region         = "eu-central-1"
    dynamodb_table = "9826119742-state"
  }
}

generate "base" {
  path = "_base.tf"
  if_exists = "overwrite_terragrunt"
  contents = <<EOF
terraform {
  backend "s3" {}
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 2.70"
    }
  }
}

provider "aws" {
  region  = "eu-central-1"
}

provider "aws" {
  region  = "us-east-1"
  alias = "us"
}
EOF
}

locals {
  secrets = yamldecode(sops_decrypt_file(("${get_parent_terragrunt_dir()}/secrets.enc.yaml")))
}

inputs = {
  cid_api_key = local.secrets.cid_api_key
  base_dir = "${get_parent_terragrunt_dir()}/.."
}

terraform {
  before_hook "before_hook" {
    commands     = ["apply", "plan"]
    execute      = ["chmod", "-R", "o+rX", "${get_parent_terragrunt_dir()}/../functions"]
  }
}
