
// this is based on hijack.js from https://blog.bearer.sh/http-api-instrumentation-nodejs/
// require this to get low-level tracing output

const http = require("http")
const https = require("https")

function httptrace() {
  override(http)
  override(https)
}

function override(module) {
  let original = module.request
  function wrapper(outgoing) {
    let req = original.apply(this, arguments)
    let emit = req.emit

    req.emit = function (eventName, response) {
      switch (eventName) {
        case "response": {

          response.on("end", () => {
            let res = {
              statusCode: response.statusCode,
              headers: response.headers,
              message: response.statusMessage,
            }
            console.log(res)
          })
        }
      }
      return emit.apply(this, arguments)
    }

    logger(outgoing)
    return req
  }

  function logger(req) {
    let log = {
      method: req.method || "GET",
      host: req.host || req.hostname || "localhost",
      port: req.port || "443",
      path: req.pathname || req.path || "/",
      headers: req.headers || {},
    }
    console.log(log)
  }

  module.request = wrapper
}

module.exports = httptrace