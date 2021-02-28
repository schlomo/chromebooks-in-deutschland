resource "aws_acm_certificate" "website" {
  provider = aws.us
  domain_name       = "*.${var.root_domain_name}"
  validation_method = "EMAIL"
  subject_alternative_names = [
    var.root_domain_name,
    format("%s.%s", var.www_host_name, var.root_domain_name)
  ]
}
