'use strict';
const
    deviceData = require("./chromebooks.json"),
    Promise = require('bluebird'),
    functions = require('firebase-functions'),
    admin = require('firebase-admin'),
    rp = require('request-promise-native'),
    express = require('express'),
    https = require('https'),
    httpsAgent = new https.Agent({ keepAlive: true }),
    { inspect } = require("util");

const emulator = "FUNCTIONS_EMULATOR" in process.env;
if (emulator) {
    require("./run-in-emulator")();
} else {
    admin.initializeApp();
}

function msleep(n) {
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, n);
}
function sleep(n) {
    msleep(n * 1000);
}

// return string formatted as DB key
function getDbKey(t) {
    return t.replace(/[.#$/[\]]/g, '_');
}

function debug(...args) {
    //console.debug(...args); 
}

/*

updateChromebookPriceData


*/

async function getIdealoPrice(productId) {
    let options = {
        uri: `https://www.idealo.de/offerpage/pricechart/api/${productId}?period=P1M`,
        pool: httpsAgent,
        json: true
    };
    return rp(options).then((jsonData) => {
        debug(jsonData);
        var data = jsonData.data;
        var lastPrice = data.pop().y;
        debug(`Idealo ${productId} = ${lastPrice}`);
        return lastPrice;
    });
}

async function getIdealoPriceNew(productId) {
    let options = {
        uri: `https://www.idealo.de/preisvergleich/OffersOfProduct/${productId}`,
        pool: httpsAgent,
        json: false
    };
    return rp(options).then((body) => {
        let match = body.match(/<title>.*ab (.*)€.*<\/title>/);
        let price = 0;
        if (match !== null) {
            let priceString = match[1].replace(/\./g, "").replace(/,/g, ".");
            let parsedPrice = parseFloat(priceString);
            if (!isNaN(parsedPrice)) {
                price = parsedPrice;
            }
        }

        if (price > 0) {
            debug(`Idealo ${productId} = ${price}`);
        } else {
            let match = body.match(/<title>.*<\/title>/);
            console.log(`Idealo ${productId} ERROR: ${match}`)
        }

        return price;
    });
}

async function getMetacompPrice(productId) {
    let options = {
        uri: `https://shop.metacomp.de/Shop-DE/Produkt-1_${productId}`,
        pool: httpsAgent,
    };
    return rp(options).then((rawData) => {
        debug(rawData);
        var price = rawData.split('<span class="integerPart">')[1].split('</span>')[0];
        debug(`Metacomp ${productId} = ${price}`);
        return Number(price);
    });
}

exports.test3 = functions.https.onRequest((request, response) => {
    Promise.resolve(getIdealoPrice("6950800")).then((val) => {
        console.log(val);
        return response.send(`Price: ${val}`);
    }).catch((error) => {
        if ("statusCode" in error) {
            console.error(`ERROR: Got Status Code ${error.statusCode} from ${error.options.uri}`)
        } else {
            console.error(error);
        }
    });
});

exports.test4 = functions.https.onRequest((request, response) => {
    Promise.resolve(getIdealoPrice("6943191")).then((val) => {
        console.log(val);
        return response.send(`Price: ${val}`);
    }).catch((error) => {
        if ("statusCode" in error) {
            console.error(`ERROR: Got Status Code ${error.statusCode} from ${error.options.uri}`)
        } else {
            console.error(error);
        }
    });
});

function updateChromebookPriceEntry(entry) {
    let id = entry.id;
    console.log(`Processing ${id}`);
    let priceFunction = undefined;
    switch (entry.productProvider) {
        case "idealo": priceFunction = getIdealoPrice; break;
        case "metacomp": priceFunction = getMetacompPrice; break;
        default: throw new Error(`PROVIDER NOT YET IMPLEMENTED: ${entry.productProvider}`);
    }
    return priceFunction(entry.productId).then((price) => {
        if (price < 0) {
            price = 0;
        }
        var priceDataEntry = [price, new Date().toISOString()];
        debug(priceDataEntry);
        return admin.database()
            .ref(`/priceData/${entry.productProvider}/${entry.productId}`).set(priceDataEntry);
    }).catch((error) => {
        if ("statusCode" in error) {
            console.error(`ERROR: Got Status Code ${error.statusCode} from ${error.options.uri}`)
        } else {
            console.error(error);
        }
    });

}

function updateChromebookPriceData() {
    return Promise.map(
        Object.values(deviceData),
        updateChromebookPriceEntry,
        { concurrency: 20 }
    );
}

exports.updateChromebookPriceData = functions.pubsub.schedule('every 19 minutes').onRun(updateChromebookPriceData);

exports.test_updateChromebookPriceData = functions.https.onRequest((request, response) => {
    updateChromebookPriceData().then((val) => {
        const msg = `OK ${val.length} entries`;
        console.log(msg);
        return response.send(msg);
    }).catch((error) => {
        if ("statusCode" in error) {
            console.error(`ERROR: Got Status Code ${error.statusCode} from ${error.options.uri}`)
        } else {
            console.error(error);
        }
    });
});


function updateChromebookPriceEntryNew(entry) {
    let id = entry.id;
    console.log(`Processing updateChromebookPriceEntryNew ${id}`);
    let priceFunction = undefined;
    switch (entry.productProvider) {
        case "idealo": priceFunction = getIdealoPriceNew; break;
        case "metacomp": priceFunction = getMetacompPrice; break;
        default: throw new Error(`PROVIDER NOT YET IMPLEMENTED: ${entry.productProvider}`);
    }
    msleep(573);
    return priceFunction(entry.productId).then((price) => {
        if (price < 0) {
            price = 0;
        }
        var priceDataEntry = [price, new Date().toISOString()];
        debug(priceDataEntry);
        return admin.database()
            .ref(`/priceDataNew/${entry.productProvider}/${entry.productId}`).set(priceDataEntry);
    }).catch((error) => {
        if ("statusCode" in error) {
            console.error(`ERROR: Got Status Code ${error.statusCode} from ${error.options.uri}`)
        } else {
            console.error(error);
        }
    });

}

function updateChromebookPriceDataNew() {
    return Promise.map(
        Object.values(deviceData),
        updateChromebookPriceEntryNew,
        { concurrency: 1 }
    );
}

exports.updateChromebookPriceDataNew = functions.pubsub.schedule('every 7 hours').onRun(updateChromebookPriceDataNew);

exports.test_updateChromebookPriceDataNew = functions.https.onRequest((request, response) => {
    updateChromebookPriceDataNew().then((val) => {
        const msg = `OK ${val.length} entries`;
        console.log(msg);
        return response.send(msg);
    }).catch((error) => {
        if ("statusCode" in error) {
            console.error(`ERROR: Got Status Code ${error.statusCode} from ${error.options.uri}`)
        } else {
            console.error(error);
        }
    });
});

const api = express()

api.get("/api/data", (req, res) => {

    // count calls & record search string if given
    const today = new Date().toISOString().substr(0, 10);
    var statisticsTodayRef = admin.database().ref(`/statistics/${today}`);
    statisticsTodayRef.transaction((statistics) => {
        // If statistics/$today has never been set, it will be `null`.
        if (statistics && "count" in statistics) {
            statistics["count"] += 1;
        } else {
            statistics = {
                count: 1,
            }
        }
        if ("search" in req.query) {
            var search_term = req.query.search;
            if (search_term && search_term.length > 3) {
                search_term = search_term.
                    replace(/[.#$/[\]]/g, " ").
                    toLowerCase();
                if ("searches" in statistics) {
                    statistics["searches"][search_term] = search_term in statistics["searches"] ? statistics["searches"][search_term] + 1 : 1;
                } else {
                    statistics["searches"] = {};
                    statistics["searches"][search_term] = 1;
                }
            }
        }
        return statistics;
    });

    return admin.database().ref('/').once('value').then((snapshot) => {
        return res.json(snapshot.val());
    }).catch((e) => {
        console.error(e);
        return res.status(500).send("ERROR, check logs");
    });
});

if (emulator) {
    api.get("*", (req, res) => {
        res.send(`<!doctype html>
        <head>
          <title>API</title>
        </head>
        <body>
          <p>API here</p>
          <pre>${inspect(req)}</pre>
        </body>
      </html>`);
    });
}

exports.api = functions.https.onRequest(api);
