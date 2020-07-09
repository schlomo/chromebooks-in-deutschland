const
    deviceData = require("./chromebooks.json"),
    admin = require('firebase-admin');

module.exports = function () {
    const conf = {
        databaseURL: `http://${process.env.FIREBASE_DATABASE_EMULATOR_HOST}/?ns=${process.env.GCLOUD_PROJECT}`,
        credential: {
            getAccessToken: function () { return { expires_in: 123, access_token: "owner" } }
        }
    };
    console.log(`Initializing for emulator`);
    admin.initializeApp(conf);
    try {
        admin.database().ref("/").set(require("../backup.json"));
        console.log("Loaded data from ../backup.json into database");
    } catch {
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
                price, new Date().toISOString()
            ]
        });
        admin.database().ref("/priceData").set(priceData);
        console.log("Generated random price data");
    }
}