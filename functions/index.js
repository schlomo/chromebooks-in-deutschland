'use strict';

const region = "europe-west3"; // https://cloud.google.com/functions/docs/locations

const
    deviceData = require("./chromebooks.json"),
    Promise = require('bluebird'),
    functions = require('firebase-functions').region(region), // set region for all
    admin = require('firebase-admin'),
    rp = require('request-promise-native'),
    express = require('express'),
    https = require('https'),
    crypto = require("crypto"),
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
    console.debug(...args);
}

function devicesByPriceAge() {
    // get a list of deviceData entries ordered by the age of their price

    return admin.database().ref('/priceData').once('value').then((snapshot) => {
        var priceData = snapshot.val();
        return Object.values(deviceData).sort((a, b) => {
            try {
                var a_price_age = new Date(priceData[a.productProvider][a.productId][1]);
                var b_price_age = new Date(priceData[b.productProvider][b.productId][1]);
                return a_price_age - b_price_age;
            } catch (e) {
                return 0;
            }
        });
    });
}
exports.test = functions.https.onRequest((request, response) => {

    devicesByPriceAge()
        .then(data => { return data.shift() }) // take first entry = oldest price
        .then((entry) => {
            return updateChromebookPriceEntryNew(entry, () => {
                return response.send("OK");
            });
        }).catch(e => {
            console.error(e);
            return response.status(500).send("ERROR, check logs");
        });
});
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
        json: false,
        method: "POST",
        headers: {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.102 Safari/537.36 " + crypto.randomBytes(50).toString("hex")
        }
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
            console.log(`Idealo ${productId} = 0 from >${match}<`)
            price = 0;
        }

        return price;
    });
    // non-200 codes like 429 go to .catch() upstream
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
    Promise.resolve(getIdealoPriceNew("6943191")).then((val) => {
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


function updateChromebookPriceEntryNew(entry, onComplete = null) {
    let id = entry.id;
    console.log(`Processing updateChromebookPriceEntryNew ${id}`);
    let priceFunction = undefined;
    switch (entry.productProvider) {
        case "idealo": priceFunction = getIdealoPriceNew; break;
        case "metacomp": priceFunction = getMetacompPrice; break;
        default: throw new Error(`PROVIDER NOT YET IMPLEMENTED: ${entry.productProvider}`);
    }
    return priceFunction(entry.productId).then((price) => {
        if (price < 0) {
            price = 0;
        }
        return {
            productProvider: entry.productProvider,
            productId: entry.productId,
            price: price,
            id: id,
        }
    }).then((priceData) => {
        var priceDataEntry = [priceData.price, new Date().toISOString()];
        // requests-promise and requests-promise-native don't support the Bluebird .tap() method which would be the optimum to avoid nesting
        // eslint-disable-next-line promise/no-nesting
        return admin.database()
            .ref(`/priceData/${priceData.productProvider}/${priceData.productId}`)
            .set(priceDataEntry, onComplete)
            .then(() => { return priceData });
    }).catch((error) => {
        if ("statusCode" in error) {
            var msg = error.statusCode === 429 ? `Blocked 429 ${error.options.uri}` : `ERROR: Got Status Code ${error.statusCode} from ${error.options.uri}`;
            console.error(msg);
            return msg;
        }
        console.error(error);
        return error;
    });

}

function updateChromebookPriceDataJustOne() {
    return devicesByPriceAge()
        .then(data => { return data.shift() }) // take first entry = oldest price
        .then(updateChromebookPriceEntryNew)
        .catch(e => {
            console.error(e);
            return e;
        });

}

exports.updateChromebookPriceDataJustOne = functions.pubsub.schedule('13 */3 * * *').onRun(updateChromebookPriceDataJustOne);

exports.test_updateChromebookPriceDataJustOne = functions.https.onRequest((request, response) => {
    updateChromebookPriceDataJustOne().then((val) => {
        const msg = `Done: ${JSON.stringify(val, null, 2)}`;
        console.log(msg);
        return response.send(msg);
    }).catch((error) => {
        if ("statusCode" in error) {
            console.error(`ERROR: Got Status Code ${error.statusCode} from ${error.options.uri}`)
        } else {
            console.error(error);
        }
        response.sendStatus(500);
    });
});

exports.test_webhook = functions.https.onRequest((request, response) => {
    // See https://webhook.site/#!/f736144d-44b4-4347-a277-02687070ee4d
    let options = {
        uri: "https://webhook.site/f736144d-44b4-4347-a277-02687070ee4d",
        pool: httpsAgent,
        json: false,
        method: "POST",
        headers: {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.102 Safari/537.36 " + crypto.randomBytes(50).toString("hex")
        }
    };
    return rp(options).then((val) => {
        return response.send(inspect(val));
    }).catch((error) => {
        return response.status(500).send(inspect(error));
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

exports.api = functions.region("us-central1") // works only in this region
    .https.onRequest(api);
