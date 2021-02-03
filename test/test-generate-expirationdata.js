const { expect } = require("chai");

const { extractModels } = require("../generate-expiration-data");

const testData = [
    {
        input: "Chromebox CBx1",
        result: ["Chromebox CBx1"],
    },
    {
        input: "Chromebook 11 (5190)",
        result: ["Chromebook 11 (5190)"],
    },
    {
        input: "Chromebook 2 (2015 Edition)",
        result: ["Chromebook 2 (2015 Edition)"],
    },
    {
        input: "Chromebook 14 (CB3-431)",
        result: ["Chromebook 14 (CB3-431)"],
    },
    {
        input: "Chromebook NL7T-360 / NL7TW-360",
        result: ["Chromebook (NL7T-360)", "Chromebook (NL7TW-360)"],
    },
    {
        input: "Chromebox CXI3, Chromebox Enterprise CXI3",
        result: ["Chromebox CXI3", "Chromebox Enterprise CXI3"]
    },
    {
        input: "Chromebase 24I2 (CA24I2), Chromebase Enterprise 24I2",
        result: ["Chromebase 24I2 (CA24I2)", "Chromebase Enterprise 24I2"]
    },
    {
        input: "Chromebook Spin 514 (CP514-1W/CP514-HH)",
        result: ["Chromebook Spin 514 (CP514-1W)", "Chromebook Spin 514 (CP514-HH)"],
    },
    {
        input: "J2 / J4 Chromebook",
        result: ["J2 Chromebook", "J4 Chromebook"],
    },
    {
        input: "Chromebook 714 (CB714-1W / CB714-1WT)",
        result: ["Chromebook 714 (CB714-1W)", "Chromebook 714 (CB714-1WT)"],
    },
    {
        input: "Chromebase (22CB25S, 22CV241)",
        result: ["Chromebase (22CB25S)", "Chromebase (22CV241)"],
    },
];

describe("generate-expirationdata", function() {
    describe('extractModels()', function() {
        testData.forEach(function(test) {
            it(`parse ${test.input} as ${test.result.join(", ")}`, function() {
                expect(extractModels(test.input)).to.eql(test.result);
            });
        });
    });
});
