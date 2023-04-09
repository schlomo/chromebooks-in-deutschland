import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import jf from 'jsonfile';

import cheerioTableparser from 'cheerio-tableparser';
import { decodeHTML as decode } from 'entities';
import { writeFileSync } from 'fs';

const chromebooks = jf.readFileSync("src/generated/chromebooks.json");
const chromebooksByIdealoId = Object.fromEntries(Object.values(chromebooks).map((entry) => {
    if (entry.productProvider == "idealo") {
        return [entry.productId, entry.id];
    }
}).filter(entry => { if (entry) { return entry; }}));
const output = "src/generated/expiration-data.json";
const url = 'https://www.idealo.de/preisvergleich/ProductCategory/3751F1059377.html?sortKey=listedSince';

function debug(...args) {
    if ("DEBUG" in process.env) {
        console.debug(...args);
    }
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
    fetch(url, {
        headers: {
            'User-Agent': 'HTTPie/2.4.0',
            'Accept': '*/*'
        }
    })
        .then(res => res.text())
        .then((rawData) => {
            writeFileSync("out.html", rawData);
            if (rawData.includes("Sicherheitsprüfung (Spam-Schutz)")) {
                throw ("Hit spam protection, aborting")
            }
            const $ = cheerio.load(rawData);
            const sections = $(".offerList-item");
            const id_description = {};
            for (const section of sections) {
                const attr = $(section).attr();
                const itemtype = attr["data-sp-itemtype"];
                if (itemtype != "PRODUCT") {
                    continue;
                }
                const itemid = attr["data-sp-itemid"];
                if (itemid in chromebooksByIdealoId) {
                    console.log(`Known ${itemid} as ${chromebooksByIdealoId[itemid]}`);
                    continue;
                }
                const description = $(".offerList-item-description-title", section).text().trim();
                id_description[itemid] = description;
                console.log(itemid, description);
            }
            return id_description;
        }).then((id_description) => console.log(id_description))
        .catch((err) => {
            console.error(err);
            process.exit(1);
        });
}