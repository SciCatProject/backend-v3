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
var publicJobIds = [];
var origDatablocks = [];
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
  "sourceFolder": "/data/visitors/biomax/20170251/20220223/raw/Tau/Tau-natB1",
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

var testPublicJob = {
  "emailJobInitiator": "scicatarchivemanger@psi.ch",
  "type": "public",
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
before(function (done) {
  app = require("../server/server");
  console.log("Waiting for 5 seconds for boot tasks to finish: ",new Date());
  setTimeout(done,5000);
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
        testPublicJob.datasetList[0].pid = pidtest;
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
        testPublicJob.datasetList[1].pid = pidtest;
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
        origDatablocks.push(encodeURIComponent(res.body["id"]));
        done();
      });
  });

  it("Adds a second origDatablock ", function (done) {
    testOriginDataBlock.datasetId = decodeURIComponent(pid2);
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
        origDatablocks.push(encodeURIComponent(res.body["id"]));
        done();
      });
  });

  it("Update isPublished to true on both datasets", function (done) {
    var filter = {
      pid: {
        inq: [pid1, pid2]
      }
    };
    request(app)
      .post("/api/v3/Datasets/update?where=" + JSON.stringify(filter) + "&access_token=" + accessTokenArchiveManager)
      .send({
        "isPublished": true
      })
      .set("Accept", "application/json")
      .expect(200)
      .expect("Content-Type", /json/)
      .end(function (err, res) {
        if (err)
          return done(err);
        res.body.should.have.property("count").and.equal(2);
        done();
      });
  });
  it("Adds a new public job request", function (done) {
    request(app)
      .post("/api/v3/Jobs")
      .send(testPublicJob)
      .set("Accept", "application/json")
      .expect(200)
      .expect("Content-Type", /json/)
      .end(function (err, res) {
        if (err)
          return done(err);
        res.body.should.have.property("type").and.be.string;
        publicJobIds.push(res.body["id"]);
        done();
        // setTimeout(done, 3000);
      });
  });

  it("Send an update status to the public job request, signal finished job with partial failure", function (done) {
    request(app)
      .put("/api/v3/Jobs/" + publicJobIds[0] + "?access_token=" + accessTokenArchiveManager)
      .send({
        "jobStatusMessage": "partially_completed",
        "jobResultObject": {
          "good": [
            {
              "status": "completed",
              "pid": decodeURIComponent(pid1),
              "sourceFolder": "/data/visitors/biomax/20170251/20220223/raw/Tau/Tau-natB1",
              "beamline": "BioMAX",
              "availableFiles": [
                {
                  "file": "file1.text"
                },
                {
                  "file": "file2.text"
                },
                {
                  "file": "file3.text"
                }
              ],
              "unavailableFiles": []
            }
          ],
          "bad": [
            {
              "status": "partially_completed",
              "pid": decodeURIComponent(pid2),
              "sourceFolder": "/data/visitors/biomax/20170251/20220223/raw/Tau/Tau-natB1",
              "beamline": "BioMAX",
              "availableFiles": [
                {
                  "file": "file1.txt"
                }
              ],
              "unavailableFiles": [
                {
                  "file": "file2.txt",
                  "reason": "No such file or directory"
                },
                {
                  "file": "file3.txt",
                  "reason": "No such file or directory"
                }
              ]
            }]
        } })
      .set("Accept", "application/json")
      .expect(200)
      .expect("Content-Type", /json/)
      .end(function (err, _res) {
        if (err)
          return done(err);
        setTimeout(done, 3000);
      });
  });

  it("Adds a new public job request to download some selected files", function (done) {
    testPublicJob.datasetList[0].files = ["file1.txt", "file2.txt"];
    request(app)
      .post("/api/v3/Jobs?access_token=" + accessTokenIngestor)
      .send(testPublicJob)
      .set("Accept", "application/json")
      .expect(200)
      .expect("Content-Type", /json/)
      .end(function (err, res) {
        //reset
        testPublicJob.datasetList[0].files = [];
        if (err)
          return done(err);
        res.body.should.have.property("type").and.be.string;
        publicJobIds.push(res.body["id"]);
        // setTimeout(done, 3000);
        done();
      });
  });

  it("Send an update status to the public job request, signal successful job", function (done) {
    request(app)
      .put("/api/v3/Jobs/" + publicJobIds[1] + "?access_token=" + accessTokenArchiveManager)
      .send(
        {
          "jobStatusMessage": "completed",
          "jobResultObject": {
            "good": [
              {
                "status": "completed",
                "pid": decodeURIComponent(pid1),
                "sourceFolder": "/data/visitors/biomax/20170251/20220223/raw/Tau/Tau-natB1",
                "beamline": "BioMAX",
                "availableFiles": [
                  {
                    "file": "file1.txt",
                  },
                  {
                    "file": "file2.txt"
                  },
                  {
                    "file": "file3.txt"
                  }
                ],
                "unavailableFiles": []
              },
              {
                "status": "completed",
                "pid": decodeURIComponent(pid2),
                "sourceFolder": "/data/visitors/biomax/20170251/20220223/raw/Tau/Tau-natB1",
                "beamline": "BioMAX",
                "availableFiles": [
                  {
                    "file": "file1.txt",
                  },
                  {
                    "file": "file2.txt"
                  },
                  {
                    "file": "file3.txt"
                  }
                ],
                "unavailableFiles": []
              }
            ],
            "bad": []

          }
        })
      .set("Accept", "application/json")
      .expect(200)
      .expect("Content-Type", /json/)
      .end(function (err, _res) {
        if (err)
          return done(err);
        // setTimeout(done, 3000);
        done();
      });
  });
  it("Adds a new public job request", function (done) {
    request(app)
      .post("/api/v3/Jobs")
      .send(testPublicJob)
      .set("Accept", "application/json")
      .expect(200)
      .expect("Content-Type", /json/)
      .end(function (err, res) {
        if (err)
          return done(err);
        res.body.should.have.property("type").and.be.string;
        publicJobIds.push(res.body["id"]);
        done();
        // setTimeout(done, 3000);
      });
  });

  it("Send an update status to the public job request, signal finished job with failure", function (done) {
    request(app)
      .put("/api/v3/Jobs/" + publicJobIds[2] + "?access_token=" + accessTokenArchiveManager)
      .send({
        "jobStatusMessage": "failed_to_start",
        "jobResultObject": {
          "good": [],
          "bad": [
            {
              "status": "failed_to_start",
              "pid": decodeURIComponent(pid1),
              "sourceFolder": "/data/visitors/biomax/20170251/20220223/raw/Tau/Tau-natB1",
              "beamline": "BioMAX",
              "availableFiles": [],
              "unavailableFiles": [
                {
                  "file": "file1.text"
                },
                {
                  "file": "file2.text"
                },
                {
                  "file": "file3.text"
                }
              ]
            },
            {
              "status": "partially_completed",
              "pid": decodeURIComponent(pid2),
              "sourceFolder": "/data/visitors/biomax/20170251/20220223/raw/Tau/Tau-natB1",
              "beamline": "BioMAX",
              "availableFiles": [
                {
                  "file": "file1.txt"
                }
              ],
              "unavailableFiles": [
                {
                  "file": "file2.txt",
                  "reason": "No such file or directory"
                },
                {
                  "file": "file3.txt",
                  "reason": "No such file or directory"
                }
              ]
            }]
        } })
      .set("Accept", "application/json")
      .expect(200)
      .expect("Content-Type", /json/)
      .end(function (err, _res) {
        if (err)
          return done(err);
        // setTimeout(done, 3000);
        done();
      });
  });
  publicJobIds.forEach(jobId => {
    it("should delete the public Job" + jobId, function (done) {
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
  origDatablocks.forEach((id) => {
    it("should delete the originDataBlock", function (done) {
      request(app)
        .delete("/api/v3/OrigDatablocks/" + id + "?access_token=" + accessTokenArchiveManager)
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
