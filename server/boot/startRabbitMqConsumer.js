"use strict";
const { RabbitMQMessageBroker } =  require("@user-office-software/duo-message-broker");
const config = require("../config.local");
const logger = require("../../common/logger");

module.exports = async function (app) {
  const Proposal = app.models.Proposal;
  let connectionDetails;

  const startConsumer = async (rabbitMq) => {
    try {
      await rabbitMq.listenOn(config.rabbitmq.queue, async (type, message) => {
        try {
          switch (type) {
          case "PROPOSAL_STATUS_CHANGED_BY_WORKFLOW":
          case "PROPOSAL_STATUS_CHANGED_BY_USER": {

            // If the status is different then the trigger status then skip the proposal creation
            if (message.newStatus !== config.proposalCreationStatusTrigger) {
              return;
            }
            /* 
                    from useroffice code, courtesy of Jekabs
                    msgJSON
                      content -> payload
                        proposalId
                        shortCode
                        title
                        members: [
                          {
                            firstName
                            lastName
                            email
                          }
                        ]
                        proposer: {
                          firstName
                          lastName
                          email
                        }
                        newStatus
                      properties
                        type -> event type
                  */
            logger.logInfo(
              "RabbitMq message for " + type,
              {
                message: message
              }
            );
            /*
              We need to refactor proposal fields to match scicat
            */
            let proposalData = {
              "proposalId": message.shortCode,
              "title": message.title,
              "pi_email": message.proposer.email,
              "pi_firstname": message.proposer.firstName,
              "pi_lastname": message.proposer.lastName,
              "email": message.proposer.email,
              "firstname": message.proposer.firstName,
              "lastname": message.proposer.lastName,
              "abstract": message.asbtract,
              "ownerGroup": "ess",
              "createdBy": "proposalIngestor"
            };
            logger.logInfo(
              "SciCat proposal data",
              {
                proposalData: proposalData
              }
            );

            Proposal.replaceOrCreate(proposalData, (error, proposalInstance) => {
              if (error) {
                logger.logError(error.message, {
                  location: "Proposal.replaceOrCreate"
                });
              } else {
                if (proposalInstance) {
                  logger.logInfo("Proposal was created/updated", {
                    proposalId: proposalData.proposalId
                  });
                }
              }
            });
            break;
          }
          default: {
            break;
          }
          }
        } catch (error) {
          logger.logError(error.message, {
            location: "channel.consume"
          });
        }
      },
      {
        noAck: false
      });
    } catch (error) {
      logger.logError(error.message, {
        location: "startConsumer",
        rabbitMq
      });
    }
  };

  const connect = async () => {
    const rabbitMq = new RabbitMQMessageBroker();

    await rabbitMq.setup({
      hostname: connectionDetails.hostname,
      username: connectionDetails.username,
      password: connectionDetails.password,
    });

    await startConsumer(rabbitMq);
  };

  const rabbitMqEnabled = config.rabbitmq ? config.rabbitmq.enabled : false;
  if (rabbitMqEnabled) {
    if (config.rabbitmq.host) {
      connectionDetails = {
        hostname: config.rabbitmq.host,
        username: config.rabbitmq.username,
        password: config.rabbitmq.password,
      };
      if (config.rabbitmq.port) {
        connectionDetails = { ...connectionDetails, port: config.rabbitmq.port };
      }
      logger.logInfo("Connecting to RabbitMq", connectionDetails);
      await connect();
    }
  }
};
