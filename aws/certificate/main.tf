variable "www_domain_name" {}

variable "root_domain_name" {}

resource "aws_acm_certificate" "website" {
  provider = aws.us
  domain_name       = "*.${var.root_domain_name}"
  validation_method = "EMAIL"
  subject_alternative_names = [
    var.root_domain_name,
    var.www_domain_name
  ]
}

output "certificate_arn" {
    value = aws_acm_certificate.website.arn
}

output "domains" {
    value = aws_acm_certificate.website.subject_alternative_names
}