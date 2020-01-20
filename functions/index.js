'use strict';
const
    Promise = require('bluebird'),
    functions = require('firebase-functions'),
    admin = require('firebase-admin'),
    rp = require('request-promise-native'),
    cheerio = require('cheerio'),
    https = require('https'), // Or use ‘http’ if you do insecure requests
    httpsAgent = new https.Agent({ keepAlive: true });
    
admin.initializeApp();

// return string formatted as DB key
function getDbKey(t) {
    return t.replace(/[.#$/[\]]/g,'_');
}

function debug(...args) { 
    //console.debug(...args); 
}

/*

updateChromebookExpirationData


*/

function getDateFromMonthYear(input) {
    var parts = input.split("(");
    return new Date("1 " + parts[0]).toISOString();
}

function getExpirationDataFromSection(html) {
    var table = html.split("<tbody>")[1].split("</tbody>")[0];
    var results = [];
    var rows = table.split("<tr>");
    rows.forEach((row) => {
        var columns = row.split("<td>").map((html) => {
            return html.replace(/(\n|<[^>]+>)/g, "");
        });
        if (columns.length < 3) {
            return;
        }
        var modelparts = columns[1].replace(/&nbsp;/g, " ").trim().split(/ \(|\/ |, |\)/g);
        var model = modelparts.shift().trim();
        var junk = modelparts.pop(); // some models have multiple submodels separated by /, sadly without system
        if (junk) {
            debug(`${columns[1]} has model ${model} and extra ${junk}, ignoring`);
        }
        var expiration = getDateFromMonthYear(columns[2].trim());
        if (modelparts.length === 0) {
            results.push([model, expiration]);
        } else {
            modelparts.forEach((submodel) => {
                results.push([model + " (" + submodel + ")", expiration]);
            });
        }

    });
    return results;
}

function getChromebookExpirationData(callback) {
    console.time('getChromebookExpirationData');
    let options = {
        uri: 'https://support.google.com/chrome/a/answer/6220366?hl=en',
        pool: httpsAgent
    }
    return rp(options).then((rawData) => {
        var sections = rawData.split('<h2 class="zippy">');
        sections.shift(); // get rid of HTML boilerplate
        var results = {};
        sections.forEach((section) => {
            var brand = section.split("</h2>")[0];
            var table = getExpirationDataFromSection(section);
            table.forEach((row) => {
                var model = row[0];
                var expiration = row[1];
                var key = getDbKey(`${brand} ${model}`);
                results[key] = {
                    brand: brand,
                    model: model,
                    expiration: expiration,
                };
            });
        });
        console.timeEnd('getChromebookExpirationData');
        return callback(results);
    }).catch((error) => {
        console.error(new Error(error));
    })
}

// getChromebookExpirationData(console.log);

function writeChromebookExpirationData(data) {
    return Promise.all([
        admin.database().ref('expiration').set(data),
        admin.database().ref('expiration_timestamp').set(new Date().toISOString())
    ]);
}

async function getChromebookData() {
    return admin.database().ref('/devices').once('value').then( (snapshot) => {
        let devices = snapshot.val();
        if (! devices) {
            devices = {};
        }
        debug(devices);


        let entries = [];
        // set the id property of an entry to the key in the devices map
        Object.entries(devices).forEach(([id, entry]) => { entry.id = id ; entries.push(entry) });
        debug(entries);
        return entries;
    });
}

exports.updateChromebookExpirationData = functions.pubsub.schedule('every 23 hours').onRun((context) => {
        return getChromebookExpirationData(writeChromebookExpirationData);
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

function updateChromebookEntry(entry) {
    let id = entry.id;
    console.log(`Processing ${id}`);
    let priceFunction = undefined;
    switch (entry.productProvider) {
        case "idealo": priceFunction = getIdealoPrice; break;
        case "metacomp": priceFunction = getMetacompPrice; break;
        default: throw new Error(`PROVIDER NOT YET IMPLEMENTED: ${entry.productProvider}`);
    }
    return priceFunction(entry.productId).then((price) => {
        entry.price = price;
        entry.priceUpdated = new Date().toISOString();
        debug(entry);
        return admin.database().ref(`/devices/${id}`).set(entry);
    }).catch((error) => {
        if ("statusCode" in error) {
            console.error(`ERROR: Got Status Code ${error.statusCode} from ${error.options.uri}`)
        } else {
            console.error(error);
        }
    });

}

exports.updateChromebookPriceData = functions.pubsub.schedule('every 17 minutes').onRun((context) => {
    return Promise.map(getChromebookData(),updateChromebookEntry,{concurrency:20});
});

// exports.helloWorld = functions.https.onRequest((request, response) => {
//     response.send("fgoo");
// });
