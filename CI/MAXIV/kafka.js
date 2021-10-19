"use strict";
const config = require("../../server/config.local");
const { Kafka } = require("kafkajs");
const Handlerbars = require("handlebars");
const fs = require("fs");
const utils = require("../../common/models/utils");

module.exports = (app) => {
  const Job = app.models.Job;
  const jobTypes = Job.types;
  const Dataset = app.models.Dataset;
  const jobEventEmitter = Job.eventEmitter;
  const markDatasetsAsScheduled = async (ids, jobType) => {
    const filter = {
      pid: {
        inq: ids
      }
    };
    switch (jobType) {
    case jobTypes.COPY:
      await Dataset.updateAll(filter, {
        "$set": {
          "datasetlifecycle.copyable": false,
          "datasetlifecycle.copyStatusMessage": "scheduledForCopyingToPublicStorage"
        }
      });
      break;
    default:
      // Do nothing. MAXIV doesn't have archive, retrive  and reset job.
      break;
    }
  };
  const getPolicy = async (ctx, id) => {
    const Policy = app.models.Policy;
    try {
      const dataset = await Dataset.findById(id, ctx.options);
      const policy = await Policy.findOne({ where: { ownerGroup: dataset.ownerGroup } }, ctx.options);
      if (policy) {
        return policy;
      } else {
        console.log("No policy found for dataset with id:", id);
        console.log("Return default policy instead.");
        // this should not happen anymore, but kept as additional safety belt
        let po = {};
        po.copyEmailNotification = true;
        po.copyEmailsToBeNotified = [];
        return po;
      }
    } catch (e) {
      const msg = "Error when looking for Policy of pgroup " + e;
      console.log("Dataset ID: ", id);
      console.log(msg);
    }
  };
    // Render email template with email context and send it
  const sendEmail = (to, cc, emailContext) => {
    const htmlTemplate = fs.readFileSync("email-templates/job-tempate.html", "utf-8");
    const emailTemplate = Handlerbars.compile(htmlTemplate);
    const email = emailTemplate(emailContext);
    const subject = emailContext.subject;
    utils.sendMail(to, cc, subject, null, null, null, email);
  };

  // Check policy settings if mail should be sent
  const applyPolicyAndSendEmail = (jobType, policy, emailContext, to, cc = "") => {
    const { failure } = emailContext;
    switch (jobType) {
    case jobTypes.COPY: {
      const { copyEmailNotification, copyEmailsToBeNotified } = policy;
      if (copyEmailsToBeNotified) {
        to += "," + copyEmailsToBeNotified.join();
      }
      // Always notify on failure
      if (copyEmailNotification || failure) {
        sendEmail(to, cc, emailContext);
      }
    }
      break;
    default:
      // Do nothing on other jobs
      break;
    }
  };

  /**
     * Create an object containing information about datasets that should be copied to public storage.
     * Only dataset with copyable = true and datablocks is empty will be sent to job queue.
     * A dataset with copyable = false is a dataset that either has already be scheduled for copying or is already copied to the public storage.
     * */
  const getFilesToCopy = async (ctx, ids) => {
    const filter = {
      fields: {
        "pid": true,
        "sourceFolder": true,
        "origdatablocks": true,
        "creationLocation": true
      },
      where: {
        pid: {
          inq: ids
        },
        "datasetlifecycle.copyable": true
      },
      include: [{ relation: "origdatablocks" }],
    };
    try {
      const datasets = await Dataset.find(filter, ctx.options);
      return {
        jobId: ctx.instance.id,
        datasets: datasets.map(x => {
          return {
            id: x.pid,
            sourceFolder: x.sourceFolder,
            beamline: x.creationLocation,
            files: x.origdatablocks
          };
        })
      };
    } catch (e) {
      console.log("Error getting file list for copy job");
    }
  };
    // Populate email context for job submission notification
  const sendStartJobEmail = async (ctx) => {
    const ids = ctx.instance.datasetList.map(x => x.pid);
    const to = ctx.instance.emailJobInitiator;
    const jobType = ctx.instance.type;
    const filter = {
      fields: {
        "pid": true,
        "sourceFolder": true,
        "size": true,
        "datasetlifecycle": true,
        "ownerGroup": true
      },
      where: {
        pid: {
          inq: ids
        }
      }
    };
    const jobData = await Dataset.find(filter, ctx.options).map(x => ({
      pid: x.pid,
      ownerGroup: x.ownerGroup,
      sourceFolder: x.sourceFolder,
      size: x.size,
      copyable: x.datasetlifecycle.copyable,
    }));
    const emailContext = {
      domainName: config.host,
      subject: `SciCat: ${jobType} job submitted successfully`,
      jobSubmissionNotification: {
        jobId: ctx.instance.id,
        jobType,
        jobData,
        additionalMsg: "This job created automatically when you made a publication. Datasets that don't show up here might be in the public storage already."
      }
    };
    const policy = await getPolicy(ctx, ids[0]);
    applyPolicyAndSendEmail(jobType, policy, emailContext, to);
  };
    // Populate email context for finished job notification
  const sendFinishJobEmail = async (ctx) => {
    // Iterate through list of jobs that were updated
    // Iterate in case of bulk update send out email to each job
    ctx.hookState.oldData.forEach( async (oldData) => {
      const currentData = await Job.findById(oldData.id, ctx.options);
      //Check that statysMessage has changed
      if (currentData.jobStatusMessage != oldData.jobStatusMessage && currentData.jobStatusMessage.indexOf("finish") !== -1) {
        const ids = currentData.datasetList.map( x => x.pid);
        let to = currentData.emailJobInitiator;
        const { type: jobType, id: jobId, jobStatusMessage, jobResultObject } = currentData;
        const failure = jobStatusMessage.indexOf("finishedSuccessful") === -1;
        const filter = {
          fields: {
            "pid": true,
            "sourceFolder": true,
            "size": true,
            "datasetlifecycle": true,
            "ownerGroup": true
          },
          where: {
            pid: {
              inq: ids
            }
          }
        };
        const datasets = (await Dataset.find(filter, ctx.options)).map(x => ({
          pid: x.pid,
          ownerGroup: x.ownerGroup,
          sourceFolder: x.sourceFolder,
          size: x.size,
          copyStatusMessage: x.datasetlifecycle.copyStatusMessage,
        }));
        // Split result into good and bad
        // Copyable still is false after job means the dataset is copied successfully
        const good = datasets.filter(function (x) {
          return !x.copyable;
        });
        // Copyable is true after job means the system failed to copy the dataset therefore it set copyable = true again
        const bad = datasets.filter(function (x) {
          return x.copyable;
        });
        // add cc message in case of failure to scicat admin
        const cc = (bad.length > 0 && config.smtpMessage && config.smtpMessage.from) ? config.smtpMessage.from : "";
        const creationTime = currentData.creationTime.toISOString().replace(/T/, " ").replace(/\..+/, "");
        const emailContext = {
          domainName: config.host,
          subject: ` Your ${jobType} job from ${creationTime} is finished ${failure? "with failure": "successfully"}`,
          jobFinishedNotification: {
            jobId,
            jobType,
            failure,
            jobStatusMessage,
            jobResultObject,
            datasets: {
              good,
              bad
            },
            additionalMsg: "The datasets are now available in public storage."
          }
        };
        const policy = await getPolicy(ctx, ids[0]);
        applyPolicyAndSendEmail(jobType, policy, emailContext, to, cc);
      }
    });
  };
    //Run on new job only
  const publishJob = async (ctx) => {
    // Only trigger on copy job since MAXIV doesn't have other jobs
    if (ctx.instance.type === Job.types.COPY) {
      const ids = ctx.instance.datasetList.map(x => x.pid);
      const jobData = await getFilesToCopy(ctx, ids);
      const kafka = new Kafka(config.jobKafkaProducer.config);
      const producer = kafka.producer();
      await producer.connect();
      await producer
        .send({
          topic: config.jobKafkaProducer.topic,
          messages: [
            {
              key: "jobId",
              value: ctx.instance.id
            },
            {
              value: JSON.stringify(jobData)
            }
          ],
        })
        .then(async() => {
          await markDatasetsAsScheduled(ids, ctx.instance.type);
          sendStartJobEmail(ctx);
        })
        .catch(e => console.error("Failed to submit job", e));
      await producer.disconnect();
    }
  };

  jobEventEmitter.addListener("jobCreated", publishJob);
  jobEventEmitter.addListener("jobUpdated", sendFinishJobEmail);
};

