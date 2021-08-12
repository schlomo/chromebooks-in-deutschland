const
    deviceData = require("./generated/chromebooks.json"),
    { inspect } = require("util");

module.exports = (admin) => {
    const conf = {
        databaseURL: `http://${process.env.FIREBASE_DATABASE_EMULATOR_HOST}/?ns=${process.env.GCLOUD_PROJECT}`,
        projectId: process.env.GCLOUD_PROJECT,
        credential: {
            getAccessToken: function () { return { expires_in: 123, access_token: "owner" }; }
        }
    };
    console.log(`Initializing for emulator`);
    const app = admin.initializeApp(conf);

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
            const random = Math.random() * 1000;
            var price = random;
            if (price < 400) { // ~ 40% without price
                price = 0;
            }
            priceData[productProvider][productId] = [
                // use random price to also generate random date variation for last price info
                // as a side effect, the most expensive device has the newest price info which makes it easy to identify
                price, new Date(Date.now() - Math.floor((1000 - random) * 100000)).toISOString()
            ];
        });
        admin.database().ref("/").set(
            {
                priceData: priceData,
                keys: {
                    random_key: "Test Data Random ID"
                }
            },
            () => {
                console.log("Generated random data");
            }
        ).catch((e) => {
            console.error("ERROR setting /", e);
        });
    }
    return app;
}