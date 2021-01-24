const
    { inspect } = require("util");

const backend = require("./backend");

try {
    version = require("./generated/version");
} catch(e) {
    version = "unknown version";
}

const [productProvider,productId] = process.argv.slice(2);
console.log(`Starting single ${version} for ${productProvider} ${productId}`);

// eslint throws promise/catch-or-return on the next line and I don't understand why, disable it
// eslint-disable-next-line
backend.getPrice({id:"id", productProvider: productProvider, productId: productId}).then((val) => {
    console.log(inspect(val));
}).catch((error) => {
    if ("statusCode" in error) {
        console.error(`ERROR: Got Status Code ${error.statusCode} from ${error.options.uri}`)
    } else {
        console.error(error);
    }
});
