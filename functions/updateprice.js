'use strict';

// update one price entry via API

const
    { inspect } = require("util"),
    apiUrl = process.env.CID_API_URL || "http://localhost:5000/api",
    apiKey = process.env.CID_API_KEY || "random_key",
    axios = require("axios").default,
    axiosRetry = require("axios-retry");

axios.defaults.timeout = 3000; // 3 second timeout
axiosRetry(axios, { 
    shouldResetTimeout: true, 
    retryDelay: axiosRetry.exponentialDelay,
    retryCondition: () => true // always retry
} );

if ("CID_HTTP_TRACE" in process.env) {
    require("./httptrace")();
}

const
    backend = require("./backend"),
    devices = require("./generated/chromebooks.json");

var version = "unknown version";
try {
    version = require("./generated/version");
} catch (e) {
    //
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

async function getEntryFromApi() {
    console.log(`Starting updateprice ${version} for ${apiUrl}`);
    return axios
        .get(
            apiUrl + "/devicesbypriceage",
            { params: { slice: 1 } }
        )
        .then(res => res.data)
        .then((data) => {
            if (Array.isArray(data) && data.length > 0) {
                return data.shift();
            }
            throw new Error(`Expected array of entries, got:\n${inspect(data)}`);
        });
}

async function getEntry(argv = process.argv) {
    if (argv.length === 4) {
        return getEntryManual(...argv.slice(2));
    }
    if (argv.length > 2 && argv[2].match("-h")) {
        console.log(`${argv[1].split("/").slice(-1)
            } [productProvider productId]`);
        process.exit(1);
    }
    return getEntryFromApi();
}

async function updatePrices(entries) {
    if (!Array.isArray(entries)) {
        entries = [entries];
    }
    return axios.post(
        apiUrl + "/price",
        { priceData: entries },
        { 
            params: { key: apiKey } , 
            headers: { "Content-type": "application/json" }
        }
    ).then(res => res.data);
}

async function main() {
    return getEntry()
        .then(backend.getPrice)
        .then(updatePrices)
        .then(console.log)
        .then(0)
        .catch((error) => {
            if (error.response) {
                console.error(`ERROR: Got Status Code ${error.response.status} from ${error.config.url}:\n${error.response.status !== 503 ? error.response.data : ""}`);
            } else if (error.isAxiosError) {
                console.error("ERROR: " + error.message);
            } else {
                console.error(error);
            }
            return 1;
        });
}

exports.lambda = async function () {
    console.log("Hey λ");
    return getEntry()
        .then(backend.getPrice)
        .then(updatePrices)
        .then(console.log)
        .catch((error) => {
            if (error.response) {
                console.error(`ERROR: Got Status Code ${error.response.status} from ${error.config.url}`);
            } else {
                console.error(inspect(error));
            }
        });
}

if (require.main === module) {
    main()
        .then(process.exit)
        .catch(console.error);
}
