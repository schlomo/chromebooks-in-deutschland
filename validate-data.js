'use strict';

const assert = require("assert");

const { expirationData, expirationTimestamp } = require("./src/generated/expiration-data"),
    { cpus, resolutions } = require("./src/consts"),
    deviceData = require("./functions/chromebooks.json");

var errors=0;

var productIDs = {};

// checks on all devices
Object.values(deviceData).map(device => {
    var OK = true;

    // check that all devices have a valid expiration ID
    if (! (device.expirationId in expirationData)) {
        console.error(`Invalid expiration ID >${device.expirationId}<`);
        OK = false;
    }

    // check that all devices have a unique productID
    var productId = device.productId;
    if (productId in productIDs) {
        console.error(`Device has same product ID as ${productIDs[productId].join(", ")}`);
        productIDs[productId].push(device.id);
        OK = false;
    } else {
        productIDs[productId] = [device.id];
    }

    if (! OK) {
        console.error(`Data:\n${JSON.stringify(device,null,2)}\n`);
        errors += 1;
    }
});

if (errors > 0) {
    process.exit(1);
} else {
    console.log(`Data is OK: ${Object.keys(deviceData).length} devices`);
}