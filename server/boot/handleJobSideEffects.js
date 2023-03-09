"use strict";
const fs = require("fs");
const config = require("../config.local");
const utils = require("../../common/models/utils");
const Handlerbars = require("handlebars");
const graphMail = require("./graph-mail");

module.exports = (app) => {

  const sendMail = config.smtpSettings && config.smtpSettings.graphEndpoint ? graphMail.sendEmailM365: utils.sendMail;
  const Job = app.models.Job;
  const jobTypes = Job.types;
  const Dataset = app.models.Dataset;
  const jobEventEmitter = Job.eventEmitter;
  const markDatasetsAsScheduled = async (ids, jobType) => {
    const statusMessage = { retrieve: "scheduledForRetrieval", archive: "scheduledForArchiving" };
    const filter = {
      pid: {
        inq: ids
      }
    };
    switch (jobType) {
    case jobTypes.ARCHIVE: {
      const values = {
        "$set": {
          "datasetlifecycle.archivable": false,
          "datasetlifecycle.retrievable": false,
          [`datasetlifecycle.${jobType}StatusMessage`]: statusMessage[jobType]
        }
      };
      await Dataset.updateAll(filter, values);
    }
      break;
    case jobTypes.PUBLIC:
    case jobTypes.RETRIEVE: {
      const values = {
        "$set": {
          [`datasetlifecycle.${jobTypes.RETRIEVE}StatusMessage`]: statusMessage[jobTypes.RETRIEVE]
        }
      };
      await Dataset.updateAll(filter, values);
    }
      break;
    default:
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
        po.archiveEmailNotification = true;
        po.retrieveEmailNotification = true;
        po.archiveEmailsToBeNotified = [];
        po.retrieveEmailsToBeNotified = [];
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
    const htmlTemplate = fs.readFileSync("email-templates/job-template.html", "utf-8");
    const emailTemplate = Handlerbars.compile(htmlTemplate);
    const email = emailTemplate(emailContext);
    const subject = emailContext.subject;
    sendMail(to, cc, subject, null, null, null, email);
  };

  // Check policy settings if mail should be sent
  const applyPolicyAndSendEmail = (jobType, policy, emailContext, to, cc = "") => {
    const { failure } = emailContext;
    switch (jobType) {
    case jobTypes.ARCHIVE: {
      const { archiveEmailNotification, archiveEmailsToBeNotified } = policy;
      if (archiveEmailsToBeNotified) {
        to += "," + archiveEmailsToBeNotified.join();
      }
      // Always notify on failure
      if (archiveEmailNotification || failure) {
        sendEmail(to, cc, emailContext);
      }
    }

      break;
    case jobTypes.PUBLIC:
    case jobTypes.RETRIEVE: {
      const { retrieveEmailNotification, retrieveEmailsToBeNotified } = policy;
      if (retrieveEmailsToBeNotified) {
        to += "," + retrieveEmailsToBeNotified.join();
      }
      // Always notify at failure
      if (retrieveEmailNotification || failure) {
        sendEmail(to, cc, emailContext);
      }
    }
      break;
    default:
      // For other jobs like reset job
      sendEmail(to, cc, emailContext);
      break;
    }
  };
    // Populate email context for job submission notification
  const sendStartJobEmail = async (ctx) => {
    const ids = ctx.instance.datasetList.map(x => x.pid);
    const to = ctx.instance.emailJobInitiator;
    const jobType = ctx.instance.type;
    switch(jobType){
    case jobTypes.ARCHIVE:
    case jobTypes.RETRIEVE:
    case jobTypes.PUBLIC: {
      const fields = {
        pid: true,
        sourceFolder: true,
        size: true,
        ownerGroup: true
      };
      let datasetLifecycleFields = () => {return {};};
      let additionalMsg = "This job is created automatically when you made a request to download some dataset(s).";
      if (ctx.instance.type !== jobTypes.PUBLIC) {
        await markDatasetsAsScheduled(ids, jobType);
        fields["datasetlifecycle"] = true;
        additionalMsg = "";
        datasetLifecycleFields = (x) => {return { archivable: x.datasetlifecycle.archivable,
          retrievable: x.datasetlifecycle.retrievable };};
      }
      const filter = {
        fields: fields,
        where: {
          pid: {
            inq: ids
          }
        }
      };
      const jobData = (await Dataset.find(filter, ctx.options)).map(x => ({
        pid: x.pid,
        ownerGroup: x.ownerGroup,
        sourceFolder: x.sourceFolder,
        size: x.size,
        ...datasetLifecycleFields(x)
      }));
      const emailContext = {
        subject: ` SciCat: Your ${jobType} job submitted successfully`,
        jobSubmissionNotification: {
          jobId: ctx.instance.id,
          jobType,
          jobData,
          additionalMsg: additionalMsg
        },
        config: config.smtpMessage,
      };
      if (ctx.instance.type !== jobTypes.PUBLIC || config.smtpSettings.applyPolicy) {
        const policy = await getPolicy(ctx, ids[0]);
        applyPolicyAndSendEmail(jobType, policy, emailContext, to);
      } else 
        sendEmail(to, "", emailContext);
    }
      break;
    default:
      // Do nothing on other jobs
      break;
    }
  };
    // Populate email context for finished job notification
  const sendFinishJobEmail = async (ctx) => {
    // Iterate through list of jobs that were updated
    // Iterate in case of bulk update send out email to each job
    ctx.hookState.oldData.forEach( async(oldData) => {
      const currentJobData = await Job.findById(oldData.id, ctx.options);
      //Check that statusMessage has changed. Only run on finished job
      if (currentJobData.jobStatusMessage != oldData.jobStatusMessage && currentJobData.jobStatusMessage.indexOf("finish") !== -1) {
        const { type: jobType, id: jobId, jobStatusMessage, jobResultObject, jobParams } = currentJobData;
        let to = currentJobData.emailJobInitiator;
        const failure = jobStatusMessage.indexOf("finishedSuccessful") === -1;
        switch(jobType) {
        case jobTypes.ARCHIVE:
        case jobTypes.RETRIEVE: 
        case jobTypes.PUBLIC: {
          let good, bad, ids, additionalMsg;
          if (ctx.instance.type !== jobTypes.PUBLIC || config.smtpSettings.applyPolicy) {
            additionalMsg = "";
            ids = currentJobData.datasetList.map(x => x.pid);
            ({ bad, good } = await extractGoodBadFromJob(ids));
            if (jobType === jobTypes.RETRIEVE && good.length > 0) 
              additionalMsg = "You can now use the command 'datasetRetriever' to move the retrieved datasets to their final destination.";
          }
          else {
            good = jobResultObject.good;
            bad = jobResultObject.bad;
            additionalMsg = "The datasets are now available in public storage and ready to be downloaded.";
          }
          // add cc message in case of failure to scicat archivemanager
          const cc = (bad.length > 0 && config.smtpMessage && config.smtpMessage.from) ? config.smtpMessage.from : "";
          const creationTime = currentJobData.creationTime.toISOString().replace(/T/, " ").replace(/\..+/, "");
          const emailContext = {
            subject: `SciCat: Your ${jobType} job from ${creationTime} is finished ${failure? "with failure": "successfully"}`,
            jobFinishedNotification: {
              jobId,
              jobType,
              failure,
              creationTime,
              jobStatusMessage,
              jobResultObject: jobResultObject,
              datasets: {
                good,
                bad
              },
              additionalMsg,
              jobParams,
            },
            config: config.smtpMessage,
          };
          if (ctx.instance.type !== jobTypes.PUBLIC || config.smtpSettings.applyPolicy) {
            const policy = await getPolicy(ctx, ids[0]);
            applyPolicyAndSendEmail(jobType, policy, emailContext, to, cc);
          }
          else 
            sendEmail(to, cc, emailContext);

        }
          break;
        default:
          //Do nothing on other jobs
          break;

        }
      }

    });
    const getDatasetsFromJob = async (ids) => {
      const filter = {
        fields: {
          "pid": true,
          "sourceFolder": true,
          "size": true,
          "datasetlifecycle": true,
          "ownerGroup": true,
          "datasetName": true
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
        archiveStatusMessage: x.datasetlifecycle.archiveStatusMessage,
        retrieveStatusMessage: x.datasetlifecycle.retrieveStatusMessage,
        archiveReturnMessage: x.datasetlifecycle.archiveReturnMessage,
        retrieveReturnMessage: x.datasetlifecycle.retrieveReturnMessage,
        retrievable: x.datasetlifecycle.retrievable,
        name: x.datasetName
      }));
      return datasets;
    };
    

    const extractGoodBadFromJob = async () => {
      const datasets = await getDatasetsFromJob();
      // split result into good and bad
      const good = datasets.filter((x) => x.retrievable);
      const bad = datasets.filter((x) => !x.retrievable);
      return { bad, good };
    };

  };
    // Listen to events from Job
  jobEventEmitter.addListener("jobCreated", sendStartJobEmail);
  jobEventEmitter.addListener("jobUpdated", sendFinishJobEmail);
};
