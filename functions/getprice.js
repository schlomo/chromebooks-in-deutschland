'use strict';

/*

Retrieve single price for given provider and ID
and print it out.

Use this to manually test the price provider backend

*/

const
    { inspect } = require("util");

const
    backend = require("./backend"),
    devices = require("./generated/chromebooks.json");

try {
    version = require("./generated/version");
} catch (e) {
    version = "unknown version";
}

if (process.argv.length !== 4) {
    console.error("Missing arguments: productProvider productId");
    process.exit(1);
}

const [productProvider, productId] = process.argv.slice(2);
console.log(`Starting getPrice ${version} for ${productProvider} ${productId}`);

var [entry] = Object.values(devices).filter((entry) => {
    return (entry.productId === productId) &&
        (entry.productProvider === productProvider);
});

if (!entry) {
    entry = {
        "id": "Unknown Device",
        "productProvider": productProvider,
        "productId": productId
    };
}

backend.getPrice(entry)
    .then((val) => {
        console.log(inspect(val));
        return Promise.resolve();
    }).catch((error) => {
        if (error.response) {
            console.error(`ERROR: Got Status Code ${error.response.status} from ${error.config.url}`)
        } else {
            console.error(error);
        }
    });
