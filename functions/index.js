const region = "europe-west3"; // https://cloud.google.com/functions/docs/locations

const
    admin = require('firebase-admin'),
    functions = require('firebase-functions').region(region),
    { inspect } = require("util");

const backend = require("./backend");


const emulator = "FUNCTIONS_EMULATOR" in process.env;

const app = emulator ?
    require("./run-in-emulator")(admin) :
    admin.initializeApp();

// console.log("options:", inspect(app.options));


exports.test = functions.https.onRequest((_, response) => {

    backend.devicesByPriceAge()
        .then(data => { return data.shift() }) // take first entry = oldest price
        .then((entry) => {
            return updateChromebookPriceEntryNew(entry, () => {
                return response.send("OK");
            });
        }).catch(e => {
            console.error(e);
            return response.status(500).send("ERROR, check logs");
        });
});

if (emulator) {
    backend.api.get("*", (req, res) => {
        res.send(`<!doctype html>
        <head>
          <title>API</title>
        </head>
        <body>
          <p>API here</p>
          <pre>${inspect(req)}</pre>
        </body>
      </html>`);
    });
}

exports.api = functions
    .region("us-central1") // works only in this region
    .https.onRequest(backend.api);

// disabled as it doesn't work (429)
// exports.updateChromebookPriceDataJustOne = functions.pubsub.schedule('13 */3 * * *').onRun(backend.updateChromebookPriceDataJustOne);

exports.test_updateChromebookPriceDataJustOne = functions.https.onRequest((_, response) => {
    backend.updateChromebookPriceDataJustOne().then((val) => {
        const msg = `Done: ${inspect(val)}`;
        console.log(msg);
        return response.send(msg);
    }).catch((error) => {
        if ("statusCode" in error) {
            console.error(`ERROR: Got Status Code ${error.statusCode} from ${error.options.uri}`)
        } else {
            console.error(error);
        }
        response.sendStatus(500);
    });
});

exports.test_webhook = functions.https.onRequest((_, response) => {
    // See https://webhook.site/#!/f736144d-44b4-4347-a277-02687070ee4d
    let options = {
        uri: "https://webhook.site/f736144d-44b4-4347-a277-02687070ee4d",
        pool: httpsAgent,
        json: false,
        method: "POST",
        headers: {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.102 Safari/537.36 " + crypto.randomBytes(50).toString("hex")
        }
    };
    return rp(options).then((val) => {
        return response.send(inspect(val));
    }).catch((error) => {
        return response.status(500).send(inspect(error));
    });
});

exports.test_updateChromebookPriceData = functions.https.onRequest((_, response) => {
    backend.updateChromebookPriceData().then((val) => {
        const msg = `OK ${val.length} entries`;
        console.log(msg);
        return response.send(msg);
    }).catch((error) => {
        if ("statusCode" in error) {
            console.error(`ERROR: Got Status Code ${error.statusCode} from ${error.options.uri}`)
        } else {
            console.error(error);
        }
    });
});