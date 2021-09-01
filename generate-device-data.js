import FastGlob from 'fast-glob';
import { mergeFiles } from 'json-merger';
import * as jf from 'jsonfile';
const writeJsonFile = jf.default.writeFileSync;
import sortedObject from 'sorted-object';

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
    } catch(err) {
        console.error(err);
        process.exit(1);
    }
}
