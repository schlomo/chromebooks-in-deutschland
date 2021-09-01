import * as jf from 'jsonfile';
const readJsonFile = jf.default.readFileSync;

const { expirationData, expirationTimeStamp } = readJsonFile("./src/generated/expiration-data.json")

import { cpus, resolutions } from "./src/consts.js";
const deviceData = readJsonFile("./src/generated/chromebooks.json");

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

    // check that all devices have a known CPU
    var cpu = device.cpu;
    if (! (cpu in cpus)) {
        console.error(`Unknown CPU >${cpu}<`);
        OK = false;
    }

    // check that all devices have a known screen resolution
    if (device.screenSize > 0) {
        var resolution = device.screenResolution;
        if (! (resolution in resolutions)) {
            console.error(`Unknown screen resolution >${resolution}<`);
            OK = false;
        }
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