'use strict';

const glob = require('glob'),
    jsonMerger = require("json-merger"),
    fs = require("fs"),
    sortedObject = require("sorted-object")
    ;

if (require.main === module) {
    try {
        const chromebookData = jsonMerger.mergeFiles(
            glob.sync('chromebooks/**/*.json')
        );
        
        const sortedCBData = sortedObject(chromebookData);
        fs.writeFileSync(
            "functions/generated/chromebooks.json", 
            JSON.stringify(sortedCBData,null,2)
        );
        const chromebookCount = Object.keys(sortedCBData).length;
        console.log(`Generated chromebook device data file with ${chromebookCount} devices.`)
    } catch(err) {
        console.error(err);
        process.exit(1);
    }
}
