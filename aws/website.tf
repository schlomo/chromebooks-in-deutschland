
# Inspiration: https://medium.com/runatlantis/hosting-our-static-site-over-ssl-with-s3-acm-cloudfront-and-terraform-513b799aec0f

locals {
  bucket_id = "38456734875-${var.www_host_name}.${var.root_domain_name}"
  origin_id = format("%s.%s", var.www_host_name, var.root_domain_name)
}

resource "aws_s3_bucket" "website" {
  bucket = local.bucket_id
  // See http://amzn.to/2Fa04ul
  policy = <<POLICY
{
  "Version":"2012-10-17",
  "Statement":[
    {
      "Sid":"AddPerm",
      "Effect":"Allow",
      "Principal": {
        "AWS":"${aws_cloudfront_origin_access_identity.origin_access_identity.iam_arn}"
      },
      "Action":["s3:GetObject"],
      "Resource":["arn:aws:s3:::${local.bucket_id}/*"]
    }
  ]
}
POLICY

  website {
    index_document = "index.html"
  }
}

module "website_files" {
  source = "hashicorp/dir/template"
  base_dir = "${var.base_dir}/public/"
}

resource "aws_s3_bucket_object" "website" {
  for_each = module.website_files.files

  key = each.key
  source  = each.value.source_path
  etag = each.value.digests.md5
  content_type = each.value.content_type

  bucket = aws_s3_bucket.website.id
}

resource "aws_cloudfront_origin_access_identity" "origin_access_identity" {}

resource "aws_cloudfront_distribution" "website" {
  origin {
    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.origin_access_identity.cloudfront_access_identity_path
    }
    domain_name = aws_s3_bucket.website.bucket_regional_domain_name
    origin_id   = local.origin_id
  }

  enabled             = true
  default_root_object = "index.html"

  // All values are defaults from the AWS console.
  default_cache_behavior {
    viewer_protocol_policy = "redirect-to-https"
    compress               = true
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    // This needs to match the `origin_id` above.
    target_origin_id       = local.origin_id
    min_ttl                = 0
    default_ttl            = 300
    max_ttl                = 300

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }
  }
  aliases = concat(
    aws_acm_certificate.website.subject_alternative_names,
    [format("%s.%s", var.www_host_name, var.root_domain_name)]
  )

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  // Here's where our certificate is loaded in!
  viewer_certificate {
    acm_certificate_arn = aws_acm_certificate.website.arn
    ssl_support_method  = "sni-only"
    minimum_protocol_version = "TLSv1.2_2019"
  }

  
}
