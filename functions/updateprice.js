const
    { inspect } = require("util"),
    apiUrl = process.env.CID_API_URL || "http://localhost:5000/api",
    apiKey = process.env.CID_API_KEY || "random_key",
    rp = require('request-promise-native');

// require("./httptrace")();

const
    backend = require("./backend"),
    devices = require("./chromebooks.json");

try {
    version = require("./generated/version");
} catch (e) {
    version = "unknown version";
}

function getEntryManual(productProvider, productId) {
    console.log(`Starting updateprice ${version} for ${productProvider} ${productId}`);
    
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
    return entry;
}

function getEntryFromApi() {
    console.log(`Starting updateprice ${version} for ${apiUrl}`);
    return rp({
        uri: apiUrl + "/devicesbypriceage",
        qs: { slice: 1 },
        json: true,
    }).then((data) => {
        if (Array.isArray(data) && data.length > 0) {
            return data.shift();
        }
        throw new Error(`Expected array of entries, got:\n${data}`);
    });
}

async function getEntry() {
    if (process.argv.length === 4) {
        return getEntryManual(...process.argv.slice(2));
    }
    if (process.argv.length > 2 && process.argv[2].match("-h")) {
        console.log(`${
            process.argv[1].split("/").slice(-1)
        } [productProvider productId]`);
        process.exit(1);
    }
    return getEntryFromApi();
}

async function updatePrices(entries) {
    if (! Array.isArray(entries)) {
        entries = [entries];
    }
    return rp({
        method: "POST",
        uri: apiUrl + "/price",
        qs: { key: apiKey },
        json: true,
        body: { priceData: entries },
    });
}

// eslint throws promise/catch-or-return on the next line and I don't understand why, disable it
// eslint-disable-next-line
getEntry()
    .then(backend.getPrice)
    .then(updatePrices)
    .then(console.log)
    .catch((error) => {
        if ("statusCode" in error) {
            console.error(`ERROR: Got Status Code ${error.statusCode} from ${error.options.uri}:\n${error.statusCode !== 503 ? error.response.body : ""}`);
        } else {
            console.error(error);
        }
        process.exit(1);
    });
