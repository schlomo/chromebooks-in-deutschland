'use strict';

const
    deviceData = require("./chromebooks.json"),
    Promise = require('bluebird'),
    admin = require('firebase-admin'),
    rp = require('request-promise-native'),
    cookiejar = rp.jar(),
    express = require('express'),
    https = require('https'),
    crypto = require('crypto'),
    httpsAgent = new https.Agent({ keepAlive: true });

require("./httptrace")();

function msleep(n) {
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, n);
}
function sleep(n) {
    msleep(n * 1000);
}

function debug(...args) {
    //console.debug(...args);
}

function devicesByPriceAge() {
    // get a list of deviceData entries ordered by the age of their price

    return admin.database().ref('/priceData').once('value').then((snapshot) => {
        var priceData = snapshot.val();
        return Object.values(deviceData).sort((a, b) => {
            var a_price_age, b_price_age;
            // Use Unix Epoch (1970) for missing date info
            try {
                a_price_age = new Date(priceData[a.productProvider][a.productId][1]);
            } catch (e) {
                a_price_age = new Date(0);
            }
            try {
                b_price_age = new Date(priceData[b.productProvider][b.productId][1]);
            } catch(e) {
                b_price_age = new Date(0);
            }
            return a_price_age - b_price_age;
        });
    });
}

/*

updateChromebookPriceData


*/

async function getIdealoPrice(productId) {
    let options = {
        uri: `https://www.idealo.de/preisvergleich/OffersOfProduct/${productId}`,
        pool: httpsAgent,
        json: false,
        jar: cookiejar,
        headers: {
            "User-Agent": "HTTPie/2.3.0",
            "Accept": "*/*"
        }
        /*
        method: "POST",
        headers: {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.102 Safari/537.36 " + crypto.randomBytes(50).toString("hex")
        }
        */
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
            console.log(`Idealo ${productId} = ${price} from ${options.uri}`);
        } else {
            let match = body.match(/<title>.*<\/title>/);
            console.log(`Idealo ${productId} = 0 from ${options.uri} »${match}«`)
            price = 0;
        }

        return price;
    });
    // non-200 codes like 429 go to .catch() upstream
}

async function getGeizhalsPrice(productId) {
    let options = {
        uri: `https://geizhals.de/a${productId}.html`,
        pool: httpsAgent,
        json: false,
        jar: cookiejar,
        headers: {
            "User-Agent": "HTTPie/2.3.0",
            "Accept": "*/*"
        }
    };
    return rp(options).then((body) => {
        let match = body.match(/<meta property='og:price:amount' content='(.*)'>/);
        let price = 0;
        if (match !== null) {
            let priceString = match[1];
            let parsedPrice = parseFloat(priceString);
            if (!isNaN(parsedPrice)) {
                price = parsedPrice;
            }
        }

        if (price > 0) {
            console.log(`Geizhals ${productId} = ${price} from ${options.uri}`);
        } else {
            let match = body.match(/<meta property='og:price:amount'.*>/);
            console.log(`Geizhals ${productId} = 0 from ${options.uri} »${match}«`)
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
        jar: cookiejar,
        headers: {
            "User-Agent": "HTTPie/2.3.0",
            "Accept": "*/*"
        }
    };
    return rp(options).then((rawData) => {
        debug(rawData);
        var price = rawData.split('<span class="integerPart">')[1].split('</span>')[0];
        debug(`Metacomp ${productId} = ${price}`);
        return Number(price);
    });
}

async function getPrice(entry) {
    // entry is device entry with id, productProvider, productId
    const { id, productId, productProvider } = entry;
    console.log(`Retrieving price for ${id}`);
    let priceFunction = undefined;
    switch (productProvider) {
        case "idealo": priceFunction = getIdealoPrice; break;
        case "geizhals": priceFunction = getGeizhalsPrice; break;
        case "metacomp": priceFunction = getMetacompPrice; break;
        default: throw new Error(`PROVIDER NOT YET IMPLEMENTED: ${productProvider}`);
    }
    return priceFunction(productId).then((price) => {
        if (price < 0) {
            price = 0;
        }
        return {
            productProvider: productProvider,
            productId: productId,
            price: price,
            id: id,
        }
    });
}

async function updateChromebookPriceEntry(entry, onComplete = null) {
    return getPrice(entry).then(async (priceData) => {
        var priceDataEntry = [priceData.price, new Date().toISOString()];
        // requests-promise and requests-promise-native don't support the Bluebird .tap() method which would be the optimum to avoid nesting
        // eslint-disable-next-line promise/no-nesting
        await admin.database()
            .ref(`/priceData/${priceData.productProvider}/${priceData.productId}`)
            .set(priceDataEntry, onComplete);
        return priceData;
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

async function updateChromebookPriceDataJustOne() {
    return devicesByPriceAge()
        .then(data => {
            debug(data.map((entry) => entry.id).join("\n")); 
            return data.shift() 
        }) // take first entry = oldest price
        .then(updateChromebookPriceEntry)
        .catch(e => {
            console.error(e);
            return e;
        });

}


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


module.exports = {
    devicesByPriceAge,
    api,
    getPrice,
    updateChromebookPriceDataJustOne,
    
};