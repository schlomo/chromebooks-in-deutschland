skip = true

locals {
  www_domain_name = "aws.chromebooks-in-deutschland.de"
  root_domain_name = "chromebooks-in-deutschland.de"
}

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

inputs = {
  base_dir = "${get_parent_terragrunt_dir()}/.."
}

terraform {
  after_hook "cloudrail_after_hook" {
    commands     = ["xplan"]

    execute      = [
      "docker", 
      "run", 
      "--rm", 
      "-v", "${get_env("PWD", "")}:/data", 
      "indeni/cloudrail-cli", 
      "run", 
      "-d", "${path_relative_to_include()}/",
      "--tf-plan", "${path_relative_to_include()}/tf.plan",
      "--origin", "ci",
      "--build-link", "https://github.com/schlomo/chromebooks-in-deutschland",
      "--execution-source-identifier", "somebuildnumber - tg module ${path_relative_to_include()}",
      "--api-key", "${get_env("CLOUDRAIL_API_KEY", "")}",
      "--auto-approve"
      ]
  }
}
