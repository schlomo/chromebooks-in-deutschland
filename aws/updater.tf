terraform {
  backend "s3" {
    bucket = "9826119742-state"
    key    = "chromebooks-in-deutschland.tfstate"
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

variable "cid_api_key" {
  description = "CID API key"
  type        = string
  sensitive   = true
}

# from https://gist.github.com/smithclay/e026b10980214cbe95600b82f67b4958

data "archive_file" "lambda_zip" {
  type        = "zip"
  source_dir  = "${path.module}/../functions"
  output_path = "${path.module}/lambda_function.zip"
}

resource "aws_lambda_function" "cid_updater" {
  description      = "Version: ${file("${path.module}/../VERSION")}"
  filename         = "${path.module}/lambda_function.zip"
  function_name    = "cid_updater"
  role             = aws_iam_role.cid_updater.arn
  handler          = "updateprice.lambda"
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
  runtime          = "nodejs12.x"
  timeout          = 10
  environment {
    variables = {
      CID_API_URL = "https://dev.chromebooks-in-deutschland.de/api"
      CID_API_KEY = "var.cid_api_key"
    }
  }
}

resource "aws_iam_role" "cid_updater" {
  name = "cid_updater"

  assume_role_policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Action": "sts:AssumeRole",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Effect": "Allow",
      "Sid": ""
    }
  ]
}
EOF
}

resource "aws_iam_role_policy_attachment" "cid_updater_execution_policy" {
  role       = aws_iam_role.cid_updater.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_cloudwatch_event_rule" "every_seven_minutes" {
  name                = "every_seven_minutes"
  schedule_expression = "rate(7 minutes)"
}

resource "aws_cloudwatch_event_target" "cid_updater_every_seven_minutes" {
  rule      = aws_cloudwatch_event_rule.every_seven_minutes.name
  target_id = "call_cid_updater"
  arn       = aws_lambda_function.cid_updater.arn
}

resource "aws_lambda_permission" "allow_cloudwatch_to_call_cid_updater" {
  statement_id  = "AllowExecutionFromCloudWatch"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.cid_updater.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.every_seven_minutes.arn
}
