# common variables used in more than one TF file

variable "base_dir" {
  description = "Base dir"
  type = string
  default = "."
}

variable "www_host_name" {
    description = "Web host"
    type = string
    default = "aws"
}

variable "root_domain_name" {
    description = "Web domain"
    type = string
    default = "chromebooks-in-deutschland.de"
}
