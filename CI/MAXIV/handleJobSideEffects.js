"use strict";
const config = require("../../server/config.local");
const { Kafka } = require("kafkajs");
const Handlerbars = require("handlebars");
const fs = require("fs");
const utils = require("../../common/models/utils");
// MAXIV
module.exports = (app) => {
  const Job = app.models.Job;
  const Dataset = app.models.Dataset;
  const jobEventEmitter = Job.eventEmitter;
  // Render email template with email context and send it
  const sendEmail = (to, cc, emailContext) => {
    const htmlTemplate = fs.readFileSync("email-templates/job-template.html", "utf-8");
    const emailTemplate = Handlerbars.compile(htmlTemplate);
    const email = emailTemplate(emailContext);
    const subject = emailContext.subject;
    utils.sendMail(to, cc, subject, null, null, null, email);
  };
  /**
   * Create an object containing information about datasets that should be copied to public storage.
   * */
  const getFilesToCopy = async (ctx) => {
    const datasetsWithSelectedFiles = [];
    const datasetsWithAllFiles = [];
    const ids = [];
    ctx.instance.datasetList.forEach(x => {
      ids.push(x.pid);
      if (x.files.length === 0) {
        datasetsWithAllFiles.push(x.pid);
      } else {
        datasetsWithSelectedFiles.push(x);
      }
    });
    const filter = {
      fields: {
        "pid": true,
        "sourceFolder": true,
        "creationLocation": true,
        "datasetId": true,
        "dataFileList": true
      },
      where: {
        pid: {
          inq: ids
        }
      },
      include: [{ relation: "origdatablocks" }],
    };
    try {
      //Indexing the result with pid
      const result = (await Dataset.find(filter, ctx.options)).reduce((acc, x) => {
        const dataset = x.toJSON();
        acc[dataset.pid] = dataset;
        return acc;
      }, {});

      const datasets = [
        ...datasetsWithAllFiles.map(pid => {
          const { sourceFolder, creationLocation, origdatablocks } = result[pid];
          const files = origdatablocks.reduce((acc, block) => {
            block.dataFileList.forEach(file => acc.push(file.path));
            return acc;
          }, []);
          return {
            pid,
            sourceFolder,
            beamline: creationLocation,
            files
          };
        }),
        ...datasetsWithSelectedFiles.map(obj => {
          const { pid, sourceFolder, creationLocation } = result[obj.pid];
          return {
            pid,
            sourceFolder,
            beamline: creationLocation,
            files: obj.files
          };
        })
      ];
      return {
        jobId: ctx.instance.id,
        datasets
      };
    } catch (e) {
      console.log("Error getting file list for copy job", e);
    }
  };
  // Populate email context for job submission notification
  const sendStartJobEmail = async (ctx, jobData) => {
    const jobType = "public";
    const to = ctx.instance.emailJobInitiator;
    const emailContext = {
      subject: `SciCat: Your ${jobType} job submitted successfully`,
      jobSubmissionNotification: {
        jobId: ctx.instance.id,
        jobType,
        jobData: jobData.datasets,
        additionalMsg: "This job is created automatically when you made a publication or requested to download some dataset(s)."
      }
    };
    sendEmail(to, "", emailContext);
  };
  // Populate email context for finished job notification
  const sendFinishJobEmail = async (ctx) => {
    // Iterate through list of jobs that were updated
    // Iterate in case of bulk update send out email to each job
    ctx.hookState.oldData.forEach(async (oldData) => {
      const currentJobData = await Job.findById(oldData.id, ctx.options);
      //Check that statusMessage has changed. Only run on finished job
      if (currentJobData.jobStatusMessage != oldData.jobStatusMessage && currentJobData.jobStatusMessage.indexOf("jobSubmitted") === -1) {
        // const ids = currentJobData.datasetList.map(x => x.pid);
        let to = currentJobData.emailJobInitiator;
        const { type: jobType, id: jobId, jobStatusMessage, jobResultObject } = currentJobData;
        const failure = jobStatusMessage !== "completed";
        if (jobType === Job.types.PUBLIC) {
          // Split result into good and bad
          const good = jobResultObject.good.reduce((acc, dataset) => {
            const openAccessPath = dataset.sourceFolder.replace("/data/visitors", "");
            const downloadLink = `${config.fileserverBaseURL}&origin_path=${encodeURIComponent(openAccessPath)}`;
            acc.push({
              pid: dataset.pid,
              downloadLink,
              availableFiles: dataset.availableFiles
            });
            return acc;
          }, []);
          const bad = jobResultObject.bad.reduce((acc, dataset) => {
            const openAccessPath = dataset.sourceFolder.replace("/data/visitors", "");
            const downloadLink = `${config.fileserverBaseURL}&origin_path=${encodeURIComponent(openAccessPath)}`;
            acc.push({
              pid: dataset.pid,
              ...(dataset.availableFiles.length > 0 && { downloadLink }),
              availableFiles: dataset.availableFiles,
              unavailableFiles: dataset.unavailableFiles
            });
            return acc;
          }, []);
          // add cc message in case of failure to scicat admin
          const cc = (bad.length > 0 && config.smtpMessage && config.smtpMessage.from) ? config.smtpMessage.from : "";
          const creationTime = currentJobData.creationTime.toISOString().replace(/T/, " ").replace(/\..+/, "");
          const emailContext = {
            subject: ` SciCat: Your ${jobType} job from ${creationTime} is finished ${failure ? "with failure" : "successfully"}`,
            jobFinishedNotification: {
              jobId,
              jobType,
              failure,
              jobStatusMessage,
              datasets: {
                good,
                bad
              },
              additionalMsg: "The datasets are now available in public storage and ready to be downloaded."
            }
          };
          sendEmail(to, cc, emailContext);
        }
      }
    });
  };
  //Run on new job only
  const publishJob = async (ctx) => {
    // Only trigger on public job since MAXIV doesn't have other jobs
    if (ctx.instance.type === Job.types.PUBLIC) {
      if (!config.jobKafkaProducer.enabled) return;
      const jobData = await getFilesToCopy(ctx);
      const kafka = new Kafka(config.jobKafkaProducer.config);
      const producer = kafka.producer();
      await producer.connect().catch(error => console.log("Error connecting to kafka cluster", error));
      await producer
        .send({
          topic: config.jobKafkaProducer.topic,
          messages: [{
            value: JSON.stringify(jobData)
          }],
        })
        .then(async () => {
          sendStartJobEmail(ctx, jobData);
        })
        .catch(e => console.error(`Failed to submit job id: ${ctx.instance.id}`, e));
      await producer.disconnect();
    }
  };
  // Listen to events from Job
  jobEventEmitter.addListener("jobCreated", publishJob);
  jobEventEmitter.addListener("jobUpdated", sendFinishJobEmail);
};
