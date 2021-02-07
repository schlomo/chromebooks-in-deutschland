include {
  path = find_in_parent_folders()
}

locals {
  secrets = yamldecode(sops_decrypt_file(("${get_parent_terragrunt_dir()}/secrets.enc.yaml")))
}

inputs = {
  cid_api_key = local.secrets.cid_api_key
}

terraform {
  before_hook "before_hook" {
    commands     = ["apply", "plan"]
    execute      = ["chmod", "-R", "o+rX", "${get_parent_terragrunt_dir()}/../functions"]
  }
}