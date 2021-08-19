'use strict';

// standalone updater to run with full Firebase admin access

// CURRENTLY NOT USED!

const
    admin = require('firebase-admin');

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


// eslint-disable-next-line promise/catch-or-return
backend.updateChromebookPriceDataJustOne()
    .catch((error) => {
        if (error.response) {
            console.error(`ERROR: Got Status Code ${error.response.status} from ${error.config.url}`)
        } else {
            console.error(error);
        }
    })
    .finally(() => {
        admin.app().delete(); // https://stackoverflow.com/a/44700503/2042547
    });

