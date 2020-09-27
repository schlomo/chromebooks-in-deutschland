const
    admin = require('firebase-admin'),
    { inspect } = require("util");

const backend = require("./backend");


const emulator = "FUNCTIONS_EMULATOR" in process.env;
if (emulator) {
    require("./run-in-emulator")(admin);
} else {
    admin.initializeApp();
}

backend.updateChromebookPriceDataJustOne().then((val) => {
    const msg = `Done: ${inspect(val)}`;
    console.log(msg);
}).catch((error) => {
    if ("statusCode" in error) {
        console.error(`ERROR: Got Status Code ${error.statusCode} from ${error.options.uri}`)
    } else {
        console.error(error);
    }
}).finally(() => {
    admin.app().delete(); // https://stackoverflow.com/a/44700503/2042547
});