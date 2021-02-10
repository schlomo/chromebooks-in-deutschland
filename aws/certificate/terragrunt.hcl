include {
  path = find_in_parent_folders()
}

locals {
  common_vars = yamldecode(file(find_in_parent_folders("common_vars.yaml")))
}

inputs = {
  www_domain_name = local.common_vars.www_domain_name
  root_domain_name = local.common_vars.root_domain_name
}