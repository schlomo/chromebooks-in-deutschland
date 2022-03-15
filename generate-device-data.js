import FastGlob from 'fast-glob';
import { mergeFiles } from 'json-merger';
import * as jf from 'jsonfile';
const writeJsonFile = jf.default.writeFileSync;
import sortedObject from 'sorted-object';
import { mkdirSync } from 'fs';

const resultFiles = [
    "functions/generated/chromebooks.json",
    "src/generated/chromebooks.json"
];

if (import.meta.url === `file://${process.argv[1]}`) {
    try {
        const chromebookData = mergeFiles(
            FastGlob.sync('chromebooks/**/*.json')
        );

        const sortedCBData = sortedObject(chromebookData);
        const chromebookCount = Object.keys(sortedCBData).length;
        resultFiles.forEach((outputFile) => {
            writeJsonFile(
                outputFile,
                sortedCBData,
                { spaces: 2 }
            );
        });

        console.log(`Generated chromebook device data files >${resultFiles.join(", ")}< with ${chromebookCount} devices.`)

        let chromebooksByExpirationId = {};
        for (const id in chromebookData) {
            const chromebook = chromebookData[id],
                expirationId = chromebook.expirationId;
            if (!chromebooksByExpirationId[expirationId]) {
                chromebooksByExpirationId[expirationId] = {}
            }
            chromebooksByExpirationId[expirationId][id] = chromebook;
        }

        /*
        // we use this to reformat/restructure the Chromebook data
        for (const expirationId in chromebooksByExpirationId) {
            const parts = expirationId.split(/[ ()]+/);
            const vendor = parts[0], model = parts.slice(1).join("-");
            mkdirSync(`chromebooks/${vendor}`, { recursive: true });
            writeJsonFile(
                `chromebooks/${vendor}/${model}.json`,
                sortedObject(chromebooksByExpirationId[expirationId]),
                { spaces: 2 })
                console.log(`${vendor}/${model} -> ${Object.keys(chromebooksByExpirationId[expirationId]).length}`);
        }
        */
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
