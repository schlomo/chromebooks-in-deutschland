'use strict';

const output = "src/generated/expiration-data.js";
const url = 'https://support.google.com/chrome/a/answer/6220366?hl=en';
const fetch = require("node-fetch");
const { writeFileSync } = require("fs");
const extraExpirationInfo = {
    "Lenovo Ideapad Duet Chromebook": {
        "brand": "Lenovo",
        "expiration": "2028-01-01T00:00:00.000Z",
        "model": "Ideapad Duet Chromebook"
    },
};

function debug(...args) {
    //console.debug(...args); 
}

// return string formatted as DB key
function getDbKey(t) {
    return t.replace(/[.#$/[\]]/g, '_');
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

fetch(url)
    .then(res => res.text())
    .then((rawData) => {
        var sections = rawData.split('<h2 class="zippy">');
        sections.shift(); // get rid of HTML boilerplate
        var expirationData = extraExpirationInfo;
        sections.forEach((section) => {
            var brand = section.split("</h2>")[0];
            var table = getExpirationDataFromSection(section);
            table.forEach((row) => {
                var model = row[0];
                var expiration = row[1];
                var key = getDbKey(`${brand} ${model}`);
                expirationData[key] = {
                    brand: brand,
                    model: model,
                    expiration: expiration,
                };
            });
        });
        var result = {
            expirationData: expirationData,
            expirationTimestamp: new Date()
        };
        writeFileSync(output, "module.exports = " + JSON.stringify(result,null,2) + ";");
        console.log(`Wrote ${Object.keys(expirationData).length} expiration records to >${output}<`);
    }).catch((err) => {
        console.error(err);
        process.exit(1);
    });
