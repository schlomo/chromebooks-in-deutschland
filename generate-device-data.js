'use strict';

const glob = require('glob'),
    jsonMerger = require("json-merger"),
    fs = require("fs"),
    sortedObject = require("sorted-object")
    ;

const resultFiles = [
    "functions/generated/chromebooks.json",
    "src/generated/chromebooks.json"
];

if (require.main === module) {
    try {
        const chromebookData = jsonMerger.mergeFiles(
            glob.sync('chromebooks/**/*.json')
        );
        
        const sortedCBData = sortedObject(chromebookData);
        const chromebookCount = Object.keys(sortedCBData).length;
        resultFiles.forEach((outputFile) => {
            fs.writeFileSync(
                outputFile,
                JSON.stringify(sortedCBData, null, 2)
            );
        });

        console.log(`Generated chromebook device data files >${resultFiles.join(", ")}< with ${chromebookCount} devices.`)
    } catch(err) {
        console.error(err);
        process.exit(1);
    }
}
