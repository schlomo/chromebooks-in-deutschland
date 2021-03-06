'use strict';

const
    admin = require('firebase-admin'),
    { inspect } = require("util");

const backend = require("./backend");

var version;
try {
    version = require("./generated/version");
} catch(e) {
    version = "unknown version";
}


const emulator = "FUNCTIONS_EMULATOR" in process.env ||
    "FIREBASE_DATABASE_EMULATOR_HOST" in process.env;
if (emulator) {
    require("./run-in-emulator")(admin);
} else {
    admin.initializeApp();
}

console.log(`Starting standalone ${version} for project >${admin.app().options.projectId}<`);

// eslint throws promise/catch-or-return on the next line and I don't understand why, disable it
// eslint-disable-next-line
backend.updateChromebookPriceDataJustOne().then((val) => {
    return;
}).catch((error) => {
    if ("statusCode" in error) {
        console.error(`ERROR: Got Status Code ${error.statusCode} from ${error.options.uri}`)
    } else {
        console.error(error);
    }
}).finally(() => {
    admin.app().delete(); // https://stackoverflow.com/a/44700503/2042547
});
