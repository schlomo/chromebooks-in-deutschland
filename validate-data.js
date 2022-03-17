import * as jf from 'jsonfile';
const readJsonFile = jf.default.readFileSync;

const { expirationData, expirationTimeStamp } = readJsonFile("./src/generated/expiration-data.json")

import { cpus, resolutions } from "./src/consts.js";
const deviceData = readJsonFile("./src/generated/chromebooks.json");

var errors=0;

var productIDs = {};

// checks on all devices
for (const key in deviceData) {
    const device = deviceData[key];
    const {
        brand,
        cpu,
        id,
        model,
        productId,
        screenResolution,
        screenSize,
        variant,
        expirationId
    } = device;
    
    var errorDescriptions = [];

    // check that they key and id match
    if (!(key === id)) {
        errorDescriptions.push(`Mismatched key >${key}< and id >${id}<`);
    }

    // check that all devices have a consistent ID
    const brandModelVariant = `${brand} ${model} (${variant})`;
    const desiredId = brandModelVariant.replaceAll(".", "-");
    if (!(key === desiredId)) {
        errorDescriptions.push(`Mismatched device key >${id}<\n            B-M-V is >${desiredId}<`);
    }
    // check that all devices have a valid expiration ID
    if (! (expirationId in expirationData)) {
        errorDescriptions.push(`Invalid expiration ID >${expirationId}<`);
    }

    // check that all devices have a unique productID
    if (productId in productIDs) {
        errorDescriptions.push(`Device has same product ID as ${productIDs[productId].join(", ")}`);
        productIDs[productId].push(id);
    } else {
        productIDs[productId] = [id];
    }

    // check that all devices have a known CPU
    if (! (cpu in cpus)) {
        errorDescriptions.push(`Unknown CPU >${cpu}<`);
    }

    // check that all devices have a known screen resolution
    if (screenSize > 0) {
        if (! (screenResolution in resolutions)) {
            errorDescriptions.push(`Unknown screen resolution >${screenResolution}<`);
        }
    }

    if (errorDescriptions.length > 0) {
        console.error(`Device ${key} has errors:\n${errorDescriptions.join("\n")}\nData:\n${JSON.stringify(device,null,2)}\n`);
        errors += 1;
    }
};

if (errors > 0) {
    console.log(`ERROR: ${errors} devices have errors`);
    process.exit(1);
} else {
    console.log(`Data is OK: ${Object.keys(deviceData).length} devices`);
}