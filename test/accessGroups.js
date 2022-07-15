"use strict";

var chai = require("chai");
var chaiHttp = require("chai-http");
var request = require("supertest");
var should = chai.should();

chai.use(chaiHttp);

var app;
var u;
var userIdentity;

before(function() {
  app = require("../server/server");

  app.models.User.findOrCreate({
    where: { username: "noGroup" }
  }, {
    username: "noGroup",
    password: "aman",
    email: "no.group@your-site.com",
    global: "false",
  }, function(err, instance, _created) {
    if (err)
      return(err);
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
    }, function(err, instance, _created) {
      if (err)
        return(err);
      else
        userIdentity = instance;
    });
  });
});

describe("Access groups test", function() {
  it("Make a request with user that has no accessGroups in his profile should succeed", async function() {
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

  it("Make a request with user that has not an Array as accessGroups in his profile should fail", async function() {
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

  it("Make a request with user that has an Array as accessGroups in his profile should succeed", async function() {
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
});

after(function() {
  userIdentity.profile = {
    username: u.username,
    email: u.email,
  };
  userIdentity.save();
});
