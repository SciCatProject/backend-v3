"use strict";
var config = require("../../server/config.local");
var DataSource = require("loopback-datasource-juggler").DataSource;
var app = require("../../server/server");
const EventEmitter = require("events");

module.exports = function (Job) {
  Job.eventEmitter = new EventEmitter();
  Job.datasetStates = {
    retrieve: "retrievable",
    archive: "archivable",
  };
  Job.types = {
    RETRIEVE: "retrieve",
    ARCHIVE: "archive",
  };

  const isEmptyObject = (obj) => {
    for (var key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        return false;
      }
    }
    return true;
  };
  const publishJob = (job, ctx) => {
    if (config.queue && config.queue === "rabbitmq") {
      job.publishJob(ctx.instance, "jobqueue");
      console.log("      Saved Job %s#%s and published to message broker", ctx.Model.modelName, ctx.instance.id);
    }
  };

  /**
     * Check that all dataset exists
     * @param {context} ctx
     * @param {List of dataset id} ids
     */
  const checkDatasetsExistance = async (ctx, ids) => {
    const Dataset = app.models.Dataset;
    const e = new Error();
    e.statusCode = 404;
    if (ids.length === 0) {
      e.message = "Empty list of datasets - no Job sent";
      throw e;
    }
    const filter = {
      fields: {
        "pid": true
      },
      where: {
        pid: {
          inq: ids
        }
      }
    };
    const datasets = await Dataset.find(filter, ctx.options);
    if (datasets.length != ids.length) {
      e.message = "At least one of the datasets could not be found - no Job sent";
      throw e;
    }
  };

  /**
     * Check that datasets if in state which the job can be performed
     * For retrieve jobs all datasets must be in state retrievable
     * For archive jobs all datasets must be in state archivevable
     * ownerGroup is tested implicitly via Ownable
    */
  const checkDatasetsState = async (ctx, type, ids) => {
    const Dataset = app.models.Dataset;
    let e = new Error();
    e.statusCode = 409;
    switch (type) {
    case Job.types.RETRIEVE: //Intentional fall through
    case Job.types.ARCHIVE: {
      const filter = {
        fields: {
          "pid": true
        },
        where: {
          [`datasetlifecycle.${Job.datasetStates[type]}`]: false,
          pid: {
            inq: ids
          }
        }
      };
      const result = await Dataset.find(filter, ctx.options);
      if (result.length > 0) {
        e.message = `The following datasets are not in ${Job.datasetStates[type]} state - no ${type} job sent:\n` + JSON.stringify(result);
        throw e;
      }
    }
      break;
    default:
      //Not check other job types
      break;
    }
  };

  /**
   * Validate if the job is performable
   */
  const validateJob = async (ctx) => {
    const ids = ctx.instance.datasetList.map(x => x.pid);
    await checkDatasetsExistance(ctx, ids);
    await checkDatasetsState(ctx, ctx.instance.type, ids);
  };

  // Attach job submission to Kafka
  if ("queue" in config && config.queue === "kafka") {
    var options = {
      //     connectionString: 'localhost:2181/'
    };
    var dataSource = new DataSource("kafka", options);
    Job.attachTo(dataSource);
  }

  Job.observe("before save", async (ctx) => {
    // email job initiator should always be the person running the job
    // therefore override this field both for users and functional accounts
    if (ctx.instance) {
      ctx.instance.emailJobInitiator = ctx.options.currentUserEmail;
      if (ctx.isNewInstance) {
        ctx.instance.jobStatusMessage = "jobSubmitted";
        await validateJob(ctx);
      }
    }
    // Save current data of the instance
    if (!ctx.isNewInstance) {
      if (ctx.where) {
        ctx.hookState.oldData = await ctx.Model.find({ where: ctx.where }).catch(e => e);
      } else {
        ctx.hookState.oldData = [await ctx.Model.findById(ctx.instance.id).catch(e => e)];
      }
    }
  });

  Job.observe("after save", (ctx, next) => {
    // Emit event so facilities can trigger custom code
    if (ctx.isNewInstance) {
      publishJob(Job, ctx);
      Job.eventEmitter.emit("jobCreated", ctx);
    } else {
      Job.eventEmitter.emit("jobUpdated", ctx);
    }
    next();
  });

  Job.datasetDetails = function (jobId, datasetFields = {}, include = {}, includeFields = {}, options, next) {
    const Dataset = app.models.Dataset;
    const Datablock = app.models.Datablock;

    Job.findById(jobId, options, function (err, job) {
      if (err) {
        return next(err);
      }
      if (!job) {
        return next(null, []);
      }
      // console.log("Job found:", JSON.stringify(job, null, 3))
      const datasetIdList = job.datasetList.map(x => x.pid);
      const filter = {
        fields: datasetFields,
        // include: include,
        where: {
          pid: {
            inq: datasetIdList
          }
        }
      };
      //console.log("filter:", JSON.stringify(filter, null, 3))
      Dataset.find(filter, options, function (err, result) {
        if (err) {
          return next(err);
        }
        // if include wanted make a second API request on included collection,
        // taking into account its own field constraints

        if (!isEmptyObject(include)) {
          if (("relation" in include) && (include.relation == "datablocks")) {
            // {"fields":{"id":1,"archiveId":1,"size":1},"where":{"datasetId":{"in":["20.500.11935/ac19baf2-a825-4a26-ad79-18039b67438f"]}}}
            const filterDB = {
              fields: includeFields,
              where: {
                datasetId: {
                  inq: datasetIdList
                }
              }
            };
            // console.log("filterDB:", JSON.stringify(filterDB, null, 3))
            // first create a copy of the object, since we need to modify it:
            var newResult = JSON.parse(JSON.stringify(result));
            Datablock.find(filterDB, options, function (err, resultDB) {
              // now merge datablock results to dataset results
              newResult.map(function (ds) {
                // add datablocks array
                const tmpds = resultDB.filter(function (db) {
                  console.log("Comparing IDS:", db.datasetId, ds.pid);
                  return db.datasetId == ds.pid;
                });
                console.log("Subset of datablocks for current dataset:", JSON.stringify(tmpds, null, 3));
                ds.datablocks = tmpds;
              });
              console.log("Result after adding datablocks:", JSON.stringify(newResult, null, 3));
              return next(null, newResult);
            });
          } else {
            return next(null, result);
          }
        } else {
          return next(null, result);
        }
      });
    });
  };
};
