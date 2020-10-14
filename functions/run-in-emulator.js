const
    deviceData = require("./chromebooks.json"),
    { inspect } = require("util")   ;

module.exports = function (admin) {
    const conf = {
        databaseURL: `http://${process.env.FIREBASE_DATABASE_EMULATOR_HOST}/?ns=${process.env.GCLOUD_PROJECT}`,
        projectId: process.env.GCLOUD_PROJECT,
        credential: {
            getAccessToken: function () { return { expires_in: 123, access_token: "owner" } }
        }
    };
    console.log(`Initializing for emulator`);
    admin.initializeApp(conf);

    try {
        admin.database().ref("/").set(require("../backup.json"));
        console.log("Loaded data from ../backup.json into database");
    } catch (error) {
        // no backup.json, generate random price data
        var priceData = {};
        Object.values(deviceData).forEach(entry => {
            const { productId, productProvider } = entry;
            if (!(productProvider in priceData)) {
                priceData[productProvider] = {};
            }
            var price = Math.random() * 1000;
            if (price < 20) {
                price = 0;
            } else {
                price += 200;
            }
            priceData[productProvider][productId] = [
                // use random price to also generate random date variation for last price info
                // as a side effect, the most expensive device has the oldest price info which makes it easy to identify
                price, new Date(Date.now() - Math.floor(price * 100000)).toISOString()
            ]
        });
        admin.database().ref("/priceData").set(priceData).then(() => {
            console.log("Generated random price data");
            return;
        }).catch((e) => {
            console.error("ERROR setting /priceData", e);
        });
    }
}