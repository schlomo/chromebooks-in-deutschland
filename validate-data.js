'use strict';

const assert = require("assert");

const { expirationData, expirationTimestamp } = require("./src/generated/expiration-data"),
    { cpus, resolutions } = require("./src/consts"),
    deviceData = require("./functions/chromebooks.json");

var errors=0;

// check that all devices have a valid expiration ID
Object.values(deviceData).map(device => {
    var OK = true;
    if (! (device.expirationId in expirationData)) {
        console.error(`Invalid expiration ID >${device.expirationId}<`);
        OK = false;
    }
    if (! OK) {
        console.error(`Data:\n${JSON.stringify(device,null,2)}\n`);
        errors += 1;
    }
});

if (errors > 0) {
    process.exit(1);
} else {
    console.log("Data is OK");
}