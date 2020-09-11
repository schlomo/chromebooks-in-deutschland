'use strict';

// sanity check - how many entries to expect at least?
const mindEntries = 315;

const assert = require("assert").strict;

const output = "src/generated/expiration-data.js";
const url = 'https://support.google.com/chrome/a/answer/6220366?hl=en';
const fetch = require("node-fetch");
const { writeFileSync } = require("fs");
const cheerio = require('cheerio');
const cheerioTableparser = require('cheerio-tableparser');
const decode = require("decode-html");

const extraExpirationInfo = {
    // This is actually called different, migrate data before removing
/*
     "expiration ID": {
        "brand": "Brand",
        "expiration": "2028-01-01T00:00:00.000Z",
        "model": "Some Chromebook Model"
    }, 
    */
};

function debug(...args) {
    // console.debug(...args); 
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
    var $ = cheerio.load(html);
    cheerioTableparser($);
    var rawData = $("table").parsetable(false, false, true);

    // var table = html.split("<tbody>")[1].split("</tbody>")[0];
    var results = [];

    rawData[0].forEach((models, index) => {
        if (models == "Product") return; // skip column headings
        var expirationRawData = rawData[1][index];
        var modelparts = decode(models).replace(/ +/, " ").split(/ \(|\/ |, |\)/g);
        var model = modelparts.shift().trim();
        var junk = modelparts.pop(); // some models have multiple submodels separated by /, sadly without system
        if (junk) {
            debug(`>${models}< has model >${model}< and extra >${junk}<, ignoring`);
        }
        debug(`- ${models} ${expirationRawData} [${modelparts}]`);
        var expiration = getDateFromMonthYear(expirationRawData);
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
        var sections = rawData.split(/<a class="zippy".*>(.*)<\/a>/);
        sections.shift(); // get rid of HTML boilerplate
        assert.ok(sections.length % 2 == 0, "After dropping HTML boilerplate, there should be an even amount of elements of Brand and Tabledata");
        var expirationData = extraExpirationInfo;
        while (sections.length > 0) {
            var brand = decode(sections.shift());
            assert.ok(brand !== undefined, "Brand cannot be undefined");
            var tableData = sections.shift();
            debug(`==== Brand ${brand} ====`);
            var table = getExpirationDataFromSection(tableData);
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
        }

        assert.ok(Object.keys(expirationData).length >= mindEntries, `Expect at least ${mindEntries} entries for expiration data`);

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
