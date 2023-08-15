// sanity check - how many entries to expect at least?
const minEntries = 360;

import { strict as assert } from 'assert';
import * as jf from 'jsonfile';
const writeJsonFile = jf.default.writeFileSync;

import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import cheerioTableparser from 'cheerio-tableparser';
import { decodeHTML as decode } from 'entities';

const output = "src/generated/expiration-data.json";
const url = 'https://support.google.com/chrome/a/answer/6220366?hl=en';

const extraExpirationInfo = {
    // Lenovo IdeaPad 5 Chromebook (82M8001X) series missing
    // came out in 2021, so probably at least till 2028
    "Lenovo IdeaPad 5 Chromebook": {
        "brand": "Lenovo",
        "model": "IdeaPad 5 Chromebook",
        "expiration": "2028-05-31T22:00:00.000Z" // just guessing here
    },
    // Lenovo IdeaPad 3 Chromebook 15 (82N40010) series missing
    // came out in 2021, so probably at least till 2028
    "Lenovo IdeaPad 3 Chromebook 15": {
        "brand": "Lenovo",
        "model": "IdeaPad 3 Chromebook 15",
        "expiration": "2028-05-31T22:00:00.000Z" // just guessing here
    },
};


function debug(...args) {
    if ("DEBUG" in process.env) {
        console.debug(...args);
    }
}


// return string formatted as DB key
function getDbKey(t) {
    return t.replace(/[.#$/[\]]/g, '_');
}

function getDateFromMonthYear(input) {
    var parts = input.split("(");
    return new Date("1 " + parts[0]).toISOString();
}

export function extractModels(input) {
    input = decode(input)
        .trim()
        .replace(/[\s\u{0000A0}]+/ug, " ") // match also unicode spaces
        .replace(".", "_"); // Use _ for . so that model can be used as dict key
    if (
        input.match(/^[^/,()]+$/g) // no special separators
        || input.match(/^.*\([\w- ]+\)$/g) // single word in () at the end
    ) {
        input = input.replace(/\s*\(/, " (") // ensure that there is exactly 1 blank before (
        debug("  Single: " + input);
        return [input];
    }

    if (
        input.match(/^.*[^)]$/g) // no parenthesis at the end, but must have / or , since otherwise it would match simple above
    ) {
        debug("  Multiple without ) at end: " + input);
        const parts = input.split(/ ?[\/,] ?/g);
        // result can be [ 'Chromebook NL7T-360', 'NL7TW-360' ] 
        //            or [ 'Chromebox CXI3', 'Chromebox Enterprise CXI3' ]
        //            or [ 'J2', 'J4 Chromebook' ]
        // count spaces in first and last element to handle this
        assert(parts.length > 1, "Expect at last two parts from: " + input);
        var firstPart = parts[0];
        if (firstPart.indexOf(" ") > 0) {
            // first part has space, check other parts
            var results = [];
            const prefix = firstPart.replace(/[\w-]+$/, ""); // prefix is everything till the last word
            var addedParenthesis = false;
            results.push(...parts.slice(1).map((part) => {
                // prepend prefix to every part
                if (part.indexOf(" ") === -1) {
                    addedParenthesis = true;
                    return prefix + "(" + part + ")";
                }
                return part;
            }));
            if (addedParenthesis) {
                firstPart = firstPart.replace(/([\w-]+)$/, "($1)");
            }
            results.unshift(firstPart);
            return results;
        } else {
            // get suffix from last element
            var lastPart = parts.slice(-1)[0];
            const postfix = lastPart.replace(/^[\w-]+/, ""); // postfix is everything after the first word
            var results = parts.slice(0, -1).map((part) => {
                if (part.indexOf(" ") === -1) {
                    return part + postfix;
                }
                return part;
            });
            results.push(lastPart)
            return results;
        }
    }

    const matches = input.match(/^(.+)\((.+)\)$/); // something (part1/part2) with or without space before (
    if (matches) {
        let [_, prefix, parts] = matches;
        prefix = prefix.trim(); // don't care if there was a space between model and (
        debug("  Prefix and parts:", prefix, parts);
        return parts.split(/[ ,\/]+/g).map(part => prefix + " (" + part + ")");
    }
    throw Error("Cannot parse: " + input);
}



function getExpirationDataFromSection(html) {
    var $ = cheerio.load(html);
    cheerioTableparser($);
    var rawData = $("table").parsetable(false, false, true);

    var results = [];

    rawData[0].forEach((models, index) => {
        if (models == "Product") return; // skip column headings
        var expirationRawData = rawData[1][index];
        var expiration = getDateFromMonthYear(expirationRawData);
        extractModels(models).map((model) => {
            debug(`- ${model} → ${expirationRawData}`);
            results.push([model, expiration]);
        });
    });
    return results;
}

if (import.meta.url === `file://${process.argv[1]}`) {
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

            const entryCount = Object.keys(expirationData).length;
            assert.ok(entryCount >= minEntries, `Expect at least ${minEntries} entries for expiration data but got only ${entryCount}`);

            var result = {
                expirationData: expirationData,
                expirationTimestamp: new Date()
            };
            writeJsonFile(output, result, { spaces: 2});
            console.log(`Wrote ${entryCount} expiration records to >${output}<`);
        }).catch((err) => {
            console.error(err);
            process.exit(1);
        });
}