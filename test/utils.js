"use strict";

var chai = require("chai");
var should = chai.should();
var utils = require("../common/models/utils.js");
let utilsTestData = require("./utilsTestData");

const superagentTests = {
  "put" : {
    method: "PUT",
    body: "<test>This is just a put test</test>",
    uri: "http://this.is.test/put",
    headers: {
      "content-type": "application/xml;charset=UTF-8",
    },
    auth: {
      "username" : "a_user",
      "password" : "the_password"
    },
  },
  "post" : {
    method: "POST",
    body: "<test>This is just a post test</test>",
    uri: "http://this.is.test/post",
    headers: {
      "content-type": "application/xml;charset=UTF-8",
    },
    auth: {
      "username": "a_user",
      "password": "the_password"
    },
  }
};


describe("utils.superagent", () => {

  it("should return an instance of superagent", () => {
    const res = utils.superagent(superagentTests["put"]);
    res.should.not.be.empty;
  });

  it("should return an instance of superagent with put method", () => {
    // TO-DO: better testing. Test structure of what's returned
    const res = utils.superagent(superagentTests["put"]);
    res.should.not.be.empty;
  });

  it("should return an instance of superagent with post method", () => {
    // TO-DO: better testing. Test structure of what's returned
    const res = utils.superagent(superagentTests["post"]);
    res.should.not.be.empty;
  });

});


describe("utils.appendSIUnitToPhysicalQuantity", () => {

  it("should append SI Unit to physical quantity", () => {
    const testData = { ...utilsTestData.testData.scientificMetadata };
    utils.appendSIUnitToPhysicalQuantity(testData);
    chai.expect(testData).to.deep.equal(utilsTestData.appendSIUnitToPhysicalQuantityExpectedData);
  });
});

describe("utils.extractMetadataKeys", () => {
  it("should return a array of unique keys", () => {
    const res = utils.extractMetadataKeys([utilsTestData.testData], "scientificMetadata");
    chai.expect(res).to.deep.equal(utilsTestData.extractMetadataKeysExpectedData);
  });
});

describe("utils.formatBytes", () => {
  const tests = [
    [0, "0 Bytes"],
    [1, "1 Bytes"],
    [123, "123 Bytes"],
    [1234, "1 KB"],
    [12345, "12 KB"],
    [123456, "121 KB"],
    [1234567, "1 MB"],
    [12345678, "12 MB"],
    [123456789, "118 MB"],
    [1234567890, "1 GB"],
    [12345678901, "11 GB"],
    [123456789012, "115 GB"],
    [1234567890123, "1 TB"],
    [12345678901234, "11 TB"],
    [123456789012345, "112 TB"],
    [1234567890123456, "1 PB"],
    [12345678901234567, "11 PB"],
    [123456789012345678, "110 PB"],
  ];
  tests.forEach(([v, t]) => {
    it(`should format bytes ${v} to human readable`, () => {
      const res = utils.formatBytes(v);
      chai.expect(res).to.be.eql(t);
    });
  });
});
