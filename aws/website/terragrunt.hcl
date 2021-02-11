include {
  path = find_in_parent_folders()
}

dependency "certificate" {
  config_path = "../certificate"
}

dependencies {
  paths = ["../certificate"]
}

inputs = {
  certificate_arn = dependency.certificate.outputs.certificate_arn
  domains = dependency.certificate.outputs.domains
  www_domain_name = local.www_domain_name
  root_domain_name = local.root_domain_name
}