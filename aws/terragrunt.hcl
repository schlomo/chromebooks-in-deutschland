locals {
  secrets = yamldecode(sops_decrypt_file(("secrets.enc.yaml")))
}

inputs = {
  cid_api_key = local.secrets.cid_api_key
}

terraform {
  before_hook "before_hook" {
    commands     = ["apply", "plan"]
    execute      = ["chmod", "-R", "o+rX", "../functions"]
  }
}