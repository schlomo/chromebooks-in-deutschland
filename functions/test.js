if (process.argv.length !== 4) {
    console.error("Missing arguments: productProvider productId");
    process.exit(1);
}

const
    admin = require('firebase-admin'),
    { inspect } = require("util");

const backend = require("./backend"),
    devices = require("./chromebooks.json");

try {
    version = require("./generated/version");
} catch (e) {
    version = "unknown version";
}


const emulator = "FUNCTIONS_EMULATOR" in process.env ||
    "FIREBASE_DATABASE_EMULATOR_HOST" in process.env;
if (emulator) {
    require("./run-in-emulator")(admin);
} else {
    admin.initializeApp();
}




const [productProvider, productId] = process.argv.slice(2, 4);

console.log(`Starting test ${version} for ${productProvider} ${productId}`);

var [entry] = Object.values(devices).filter((entry) => {
    return (entry.productId === productId) &&
        (entry.productProvider === productProvider);
}
);

if (! entry) { 
    entry = {
        "id": "Unknown Device", 
        "productProvider": productProvider, 
        "productId": productId
    };
}

// eslint throws promise/catch-or-return on the next line and I don't understand why, disable it
// eslint-disable-next-line
backend.getPrice(entry).then((val) => {
    console.log(inspect(val));
}).catch((error) => {
    if ("statusCode" in error) {
        console.error(`ERROR: Got Status Code ${error.statusCode} from ${error.options.uri}`)
    } else {
        console.error(error);
    }
}).finally(() => {
    admin.app().delete(); // https://stackoverflow.com/a/44700503/2042547
});
