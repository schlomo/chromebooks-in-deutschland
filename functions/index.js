const
    functions = require('firebase-functions'),
    admin = require('firebase-admin'),
    rp = require('request-promise-native'),
    cheerio = require('cheerio');

admin.initializeApp();

// return string formatted as DB key
function getDbKey(t) {
    return t.replace(/[.#$/[\]]/g,'_');
}

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
            console.debug(`${columns[1]} has model ${model} and extra ${junk}, ignoring`);
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
    return rp('https://support.google.com/chrome/a/answer/6220366?hl=en').then((rawData) => {
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

exports.updateChromebookExpirationData = functions.pubsub.schedule('every 7 minutes').onRun((context) => {
        return getChromebookExpirationData(writeChromebookExpirationData);
    });

// exports.helloWorld = functions.https.onRequest((request, response) => {
//     response.send("fgoo");
// });
