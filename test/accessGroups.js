"use strict";

const { expect } = require("chai");
var chai = require("chai");
var chaiHttp = require("chai-http");
var request = require("supertest");
var should = chai.should();

chai.use(chaiHttp);

var app;
var u;
var u2;
var userIdentity;
var userIdentity2;

var testUndefinedInstrumentGroup = {
  "principalInvestigator": "bertram.astor@grumble.com",
  "endTime": "2011-09-14T06:31:25.000Z",
  "creationLocation": "/PSI/SLS/MX",
  "dataFormat": "Upchuck pre 2017",
  "scientificMetadata": {
    "beamlineParameters": {
      "Monostripe": "Ru/C",
      "Ring current": {
        "v": 0.402246,
        "u": "A"
      },
      "Beam energy": {
        "v": 22595,
        "u": "eV"
      }
    },
  },
  "owner": "Bertram Astor",
  "ownerEmail": "bertram.astor@grumble.com",
  "orcidOfOwner": "unknown",
  "contactEmail": "bertram.astor@grumble.com",
  "sourceFolder": "/iramjet/tif/",
  "size": 0,
  "creationTime": "2011-09-14T06:08:25.000Z",
  "description": "None",
  "isPublished": false,
  "ownerGroup": "p10029",
  "accessGroups": ["excludeNoGroup"],
  "proposalId": "10.540.16635/20110123"
};

before(function () {
  app = require("../server/server");

  app.models.User.findOrCreate({
    where: { username: "noGroup" }
  }, {
    username: "noGroup",
    password: "aman",
    email: "no.group@your-site.com",
    global: "false",
  }, function (err, instance, _created) {
    if (err)
      return (err);
    else
      u = instance;

    app.models.UserIdentity.findOrCreate({
      where: { userId: u.id }
    }, {
      userId: u.id,
      profile: {
        username: u.username,
        email: u.email,
      }
    }, function (err, instance, _created) {
      if (err)
        return (err);
      else
        userIdentity = instance;
    });
  });

  app.models.User.findOrCreate({
    where: { username: "hasGroup" }
  }, {
    username: "hasGroup",
    password: "aman",
    email: "has.group@your-site.com",
    global: "false",
  }, function (err, instance, _created) {
    if (err){

      return (err);
    }
    else
      u2 = instance;

    app.models.UserIdentity.findOrCreate({
      where: { userId: u2.id }
    }, {
      userId: u2.id,
      profile: {
        username: u2.username,
        email: u2.email,
      }
    }, function (err, instance, _created) {
      if (err)
        return (err);
      else
        userIdentity2 = instance;
    });
  });
});

describe("Access groups test", function () {
  it("Make a request with user that has no accessGroups in his profile should succeed", async function () {
    const loginResponse = await request(app)
      .post("/api/v3/Users/Login?include=user")
      .send({
        username: "noGroup",
        password: "aman"
      })
      .set("Accept", "application/json");

    const datasetResponse = await request(app)
      .get(`/api/v3/Datasets?access_token=${loginResponse.body.id}`)
      .set("Accept", "application/json");
    datasetResponse.statusCode.should.equal(200);
  });

  it("Make a request with user that has not an Array as accessGroups in his profile should fail", async function () {
    userIdentity.profile.accessGroups = 1;
    userIdentity.save();
    const loginResponse = await request(app)
      .post("/api/v3/Users/Login?include=user")
      .send({
        username: "noGroup",
        password: "aman"
      })
      .set("Accept", "application/json");

    const datasetResponse = await request(app)
      .get(`/api/v3/Datasets?access_token=${loginResponse.body.id}`)
      .set("Accept", "application/json");
    datasetResponse.statusCode.should.equal(500);
  });

  it("Make a request with user that has an Array as accessGroups in his profile should succeed", async function () {
    userIdentity.profile.accessGroups = ["group1", "goup2"];
    userIdentity.save();
    const loginResponse = await request(app)
      .post("/api/v3/Users/Login?include=user")
      .send({
        username: "noGroup",
        password: "aman"
      })
      .set("Accept", "application/json");

    const datasetResponse = await request(app)
      .get(`/api/v3/Datasets?access_token=${loginResponse.body.id}`)
      .set("Accept", "application/json");
    datasetResponse.statusCode.should.equal(200);
  });

  it("Makes a request with an undefined profile email and does not get a dataset with an undefined sharedWith but with different accessGroups", async function () {
    userIdentity.profile.email = undefined;
    userIdentity.profile.accessGroups = [];
    userIdentity.save();

    userIdentity2.profile.accessGroups = ["excludeNoGroup"];
    userIdentity2.save();

    const hasGroupLoginResponse = await request(app)
      .post("/api/v3/Users/Login?include=user")
      .send({
        username: "hasGroup",
        password: "aman"
      })
      .set("Accept", "application/json").expect(200);


    await request(app)
      .post("/api/v3/RawDatasets?access_token=" + hasGroupLoginResponse.body.id)
      .send(testUndefinedInstrumentGroup)
      .set("Accept", "application/json")
      .expect(200)
      .expect("Content-Type", /json/);

    const noGroupLoginResponse = await request(app)
      .post("/api/v3/Users/Login?include=user")
      .send({
        username: "noGroup",
        password: "aman"
      })
      .set("Accept", "application/json");

    const datasetResponse = await request(app)
      .get(`/api/v3/Datasets?access_token=${noGroupLoginResponse.body.id}`)
      .set("Accept", "application/json");
    datasetResponse.statusCode.should.equal(200);

    datasetResponse.body.forEach(element => {
      expect(element.isPublished).to.be.true;

    });
  });

});

afterEach(function () {
  userIdentity.profile = {
    username: u.username,
    email: u.email,
  };
  userIdentity.save();

  userIdentity2.profile = {
    username: u2.username,
    email: u2.email,
  };
  userIdentity2.save();
});

after(function () {
  u.destroy();
  userIdentity.destroy();
  u2.destroy();
  userIdentity2.destroy();
});
