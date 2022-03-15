import FastGlob from 'fast-glob';
import { mergeFiles } from 'json-merger';
import * as jf from 'jsonfile';
const writeJsonFile = jf.default.writeFileSync;
import * as writeYamlFile from 'write-yaml-file';
import sortedObject from 'sorted-object';
import { mkdirSync } from 'fs';

const resultFiles = [
    "functions/generated/chromebooks.json",
    "src/generated/chromebooks.json"
];

if (import.meta.url === `file://${process.argv[1]}`) {
    try {
        const chromebookData = mergeFiles(
            FastGlob.sync('chromebooks/**/*.yaml')
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
            const
                parts = expirationId.split(/[ ()]+/),
                vendor = parts[0],
                model = parts.slice(1).join("-").replace(/-$/, ""),
                dirName = `chromebooks/${vendor}`,
                fileName = `${dirName}/${model}.yaml`;
            mkdirSync(dirName, { recursive: true });
            writeYamlFile.sync(
                fileName,
                sortedObject(chromebooksByExpirationId[expirationId])
            );
            console.log(`${fileName} -> ${Object.keys(chromebooksByExpirationId[expirationId]).length}`);
        }
        */
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
