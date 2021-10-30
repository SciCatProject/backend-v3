"use strict";

// process.env.NODE_ENV = 'test';

var chai = require("chai");
var chaiHttp = require("chai-http");
var request = require("supertest");
var should = chai.should();
var utils = require("./LoginUtils");

chai.use(chaiHttp);

var accessTokenIngestor = null;
var accessTokenArchiveManager = null;

var pid1 = null;
var pid2 = null;
var copyJobIds = [];
var origDatablockId = null;
var testraw = {
  "principalInvestigator": "bertram.astor@grumble.com",
  "endTime": "2011-09-14T06:31:25.000Z",
  "creationLocation": "/SU/XQX/RAMJET",
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
    "detectorParameters": {
      "Objective": 20,
      "Scintillator": "LAG 20um",
      "Exposure time": {
        "v": 0.4,
        "u": "s"
      }
    },
    "scanParameters": {
      "Number of projections": 1801,
      "Rot Y min position": {
        "v": 0,
        "u": "deg"
      },
      "Inner scan flag": 0,
      "File Prefix": "817b_B2_",
      "Sample In": {
        "v": 0,
        "u": "m"
      },
      "Sample folder": "/ramjet/817b_B2_",
      "Number of darks": 10,
      "Rot Y max position": {
        "v": 180,
        "u": "deg"
      },
      "Angular step": {
        "v": 0.1,
        "u": "deg"
      },
      "Number of flats": 120,
      "Sample Out": {
        "v": -0.005,
        "u": "m"
      },
      "Flat frequency": 0,
      "Number of inter-flats": 0
    }
  },
  "owner": "Bertram Astor",
  "ownerEmail": "bertram.astor@grumble.com",
  "orcidOfOwner": "unknown",
  "contactEmail": "bertram.astor@grumble.com",
  "sourceFolder": "/iramjet/tif/",
  "size": 0,
  "creationTime": "2011-09-14T06:08:25.000Z",
  "description": "The ultimate test",
  "isPublished": false,
  "ownerGroup": "p10029",
  "accessGroups": [],
  "proposalId": "10.540.16635/20110123",
  "keywords": ["sls", "protein"]
};

const testOriginDataBlock = {
  "size": 10,
  "ownerGroup": "p10029",
  "accessGroups": [],
  "datasetId": "dummy",
  "dataFileList": [
    {
      "path": "file1.txt",
      "size": 2,
      "time": "2021-10-28T13:34:15.207Z"
    },
    {
      "path": "file2.txt",
      "size": 3,
      "time": "2021-10-28T13:34:15.207Z"
    },
    {
      "path": "file3.txt",
      "size": 4,
      "time": "2021-10-28T13:34:15.207Z"
    }
  ]
};

var testCopyJob = {
  "emailJobInitiator": "scicatarchivemanger@psi.ch",
  "type": "copy",
  "jobStatusMessage": "jobSubmitted",
  "datasetList": [{
    "pid": "dummy",
    "files": []
  },
  {
    "pid": "dummy",
    "files": []
  }
  ]
};
var app;
// before(function () {
//   app = require("../server/server");
// });
before(function (done) {
  app = require("../server/server");
  console.log("Waiting for 5 seconds for boot tasks to finish: ", new Date());
  setTimeout(done, 5000);
});

describe("Test New Job Model", () => {
  before((done) => {
    utils.getToken(app, {
      "username": "ingestor",
      "password": "aman"
    },
    (tokenVal) => {
      accessTokenIngestor = tokenVal;
      utils.getToken(app, {
        "username": "archiveManager",
        "password": "aman"
      },
      (tokenVal) => {
        accessTokenArchiveManager = tokenVal;
        done();
      });
    });
  });

  it("adds a new raw dataset", function (done) {
    request(app)
      .post("/api/v3/RawDatasets?access_token=" + accessTokenIngestor)
      .send(testraw)
      .set("Accept", "application/json")
      .expect(200)
      .expect("Content-Type", /json/)
      .end(function (err, res) {
        if (err)
          return done(err);
        res.body.should.have.property("owner").and.be.string;
        res.body.should.have.property("type").and.equal("raw");
        res.body.should.have.property("pid").and.be.string;
        // store link to this dataset in datablocks
        var pidtest = res.body["pid"];
        testCopyJob.datasetList[0].pid = pidtest;
        testOriginDataBlock.datasetId = pidtest;
        pid1 = encodeURIComponent(res.body["pid"]);
        done();
      });
  });
  it("adds another new raw dataset", function (done) {
    request(app)
      .post("/api/v3/RawDatasets?access_token=" + accessTokenIngestor)
      .send(testraw)
      .set("Accept", "application/json")
      .expect(200)
      .expect("Content-Type", /json/)
      .end(function (err, res) {
        if (err)
          return done(err);
        res.body.should.have.property("owner").and.be.string;
        res.body.should.have.property("type").and.equal("raw");
        res.body.should.have.property("pid").and.be.string;
        // store link to this dataset in datablocks
        var pidtest = res.body["pid"];
        testCopyJob.datasetList[1].pid = pidtest;
        pid2 = encodeURIComponent(res.body["pid"]);
        done();
      });
  });

  it("Adds a new origDatablock ", function (done) {
    request(app)
      .post("/api/v3/OrigDatablocks?access_token=" + accessTokenIngestor)
      .send(testOriginDataBlock)
      .set("Accept", "application/json")
      .expect(200)
      .expect("Content-Type", /json/)
      .end(function (err, res) {
        if (err)
          return done(err);
        res.body.should.have.property("size").and.equal(10);
        res.body.should.have.property("id").and.be.string;
        origDatablockId = encodeURIComponent(res.body["id"]);
        done();
      });
  });

  it("Adds a new copy job request", function (done) {
    request(app)
      .post("/api/v3/Jobs?access_token=" + accessTokenIngestor)
      .send(testCopyJob)
      .set("Accept", "application/json")
      .expect(200)
      .expect("Content-Type", /json/)
      .end(function (err, res) {
        if (err)
          return done(err);
        res.body.should.have.property("type").and.be.string;
        copyJobIds.push(res.body["id"]);
        done();
      });
  });

  it("Send an update status to the copy job request, signal finished job with partial failure", function (done) {
    request(app)
      .put("/api/v3/Jobs/" + copyJobIds[0] + "?access_token=" + accessTokenArchiveManager)
      .send({
        "jobStatusMessage": "finishedUnsuccessful",
        "jobResultObject": {
          "good": [{
            "pid": decodeURI(pid1),
            "downloadLink": "Globus link"
          }],
          "bad": [{
            "pid": decodeURI(pid2),
            "downloadLink": "Globus link",
            "availableFiles": [{
              file: "file1.txt",
              reason: "ok"
            }, {
              file: "file2.txt",
              reason: "ok"
            }],
            "unavailableFiles": [{
              file: "file3.txt",
              reason: "no space in destination"
            }],
          }]
        }
      })
      .set("Accept", "application/json")
      .expect(200)
      .expect("Content-Type", /json/)
      .end(function (err, _res) {
        if (err)
          return done(err);
        setTimeout(done, 3000);
      });
  });

  it("Adds a new copy job request with to copy some selected files", function (done) {
    testCopyJob.datasetList[0].files = ["file1.txt", "file2.txt"];
    request(app)
      .post("/api/v3/Jobs?access_token=" + accessTokenIngestor)
      .send(testCopyJob)
      .set("Accept", "application/json")
      .expect(200)
      .expect("Content-Type", /json/)
      .end(function (err, res) {
        //reset
        testCopyJob.datasetList[0].files = [];
        if (err)
          return done(err);
        res.body.should.have.property("type").and.be.string;
        copyJobIds.push(res.body["id"]);
        setTimeout(done, 3000);
      });
  });

  it("Send an update status to the copy job request, signal successful job", function (done) {
    request(app)
      .put("/api/v3/Jobs/" + copyJobIds[1] + "?access_token=" + accessTokenArchiveManager)
      .send({
        "jobStatusMessage": "finishedSuccessful",
        "jobResultObject": {
          "good": [{
            "pid": decodeURI(pid1),
            "downloadLink": "Globus link 1"
          },
          {
            "pid": decodeURI(pid2),
            "downloadLink": "Globus link 2"
          }],
          "bad": []
        }
      })
      .set("Accept", "application/json")
      .expect(200)
      .expect("Content-Type", /json/)
      .end(function (err, _res) {
        if (err)
          return done(err);
        setTimeout(done, 3000);
      });
  });

  it("Adds a new copy job request with to copy some selected files the dont exist, which should fail", function (done) {
    testCopyJob.datasetList[0].files = ["file1.txt", "file100.txt"];
    request(app)
      .post("/api/v3/Jobs?access_token=" + accessTokenIngestor)
      .send(testCopyJob)
      .set("Accept", "application/json")
      .expect(404)
      .expect("Content-Type", /json/)
      .end(function (err, res) {
        //reset
        testCopyJob.datasetList[0].files = [];
        if (err)
          return done(err);
        res.body.should.have.property("error").and.be.string;
        done();
      });
  });

  copyJobIds.forEach(jobId => {
    it("should delete the copy Job" + jobId, function (done) {
      request(app)
        .delete("/api/v3/Jobs/" + jobId + "?access_token=" + accessTokenArchiveManager)
        .set("Accept", "application/json")
        .expect(200)
        .expect("Content-Type", /json/)
        .end((err, _res) => {
          if (err)
            return done(err);
          done();
        });
    });
  });

  it("should delete the originDataBlock", function (done) {
    request(app)
      .delete("/api/v3/OrigDatablocks/" + origDatablockId + "?access_token=" + accessTokenArchiveManager)
      .set("Accept", "application/json")
      .expect(200)
      .expect("Content-Type", /json/)
      .end((err, _res) => {
        if (err)
          return done(err);
        done();
      });
  });


  it("should delete the newly created dataset", function (done) {
    request(app)
      .delete("/api/v3/Datasets/" + pid1 + "?access_token=" + accessTokenArchiveManager)
      .set("Accept", "application/json")
      .expect(200)
      .expect("Content-Type", /json/)
      .end((err, _res) => {
        if (err)
          return done(err);
        done();
      });
  });

  it("should delete the second newly created dataset", function (done) {
    request(app)
      .delete("/api/v3/Datasets/" + pid2 + "?access_token=" + accessTokenArchiveManager)
      .set("Accept", "application/json")
      .expect(200)
      .expect("Content-Type", /json/)
      .end((err, _res) => {
        if (err)
          return done(err);
        done();
      });
  });
});
