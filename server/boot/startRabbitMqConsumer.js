"use strict";
const amqp = require("amqplib");
const config = require("../config.local");
const logger = require("../../common/logger");
const utils = require("../../common/models/utils");

module.exports = async function (app) {
  const Proposal = app.models.Proposal;
  let connectionDetails;

  const startConsumer = async (connection) => {
    try {
      const channel = await connection.createChannel();
      await channel.assertExchange("useroffice.fanout", "fanout", { durable: true });
      const queueName = await channel.assertQueue("", { exclusive: true });
      await channel.bindQueue(queueName.queue, "useroffice.fanout", "");
      channel.prefetch(1);

      logger.logInfo("RABBITMQ Waiting for messages", {
        queue: queueName.queue
      });

      await channel.consume(queueName.queue, async (msg) => {
        try {
          const payload = JSON.parse(msg.content);
          logger.logInfo("Message properties", JSON.stringify(msg.properties).toString());
          logger.logInfo("Message body", JSON.stringify(payload).toString());
          switch (msg.properties.type) {
          case "PROPOSAL_ACCEPTED": {
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
                      properties
                        type -> event type
                  */
            logger.logInfo(
              "RabbitMq message for PROPOSAL_ACCEPTED",
              {
                message: payload
              }
            );
            /*
                    We need to refactor proposal fields to match scicat
                    */
            let proposalData = {
              "proposalId": payload.shortCode,
              "title": payload.title,
              "pi_email": payload.proposer.email,
              "pi_firstname": payload.proposer.firstName,
              "pi_lastname": payload.proposer.lastName,
              "email": payload.proposer.email,
              "firstname": payload.proposer.firstName,
              "lastname": payload.proposer.lastName,
              "abstract": payload.asbtract,
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
            channel.ack(msg);
            break;
          }
          default: {
            channel.ack(msg);
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
        connection
      });
    }
  };

  const sendNotificationEmail = () => {
    if ("smtpMessage" in config && "to" in config.smtpMessage && config.smtpMessage.to) {
      const subjectText = "Failed to connect to RabbitMQ";
      let mailText = "Hello,\n Scicat backend failed to connect to RabbitMQ\n";
      mailText += "Connection details:\n";
      mailText += JSON.stringify(connectionDetails, null, 3);
      utils.sendMail(config.smtpMessage.to, "", subjectText, mailText, null, null);
    } else {
      logger.logWarn("smtpMessage is not configured properly no email was sent", {
        location: "sendNotificationEmail"
      });
    }
  };

  let connectionAttempts = 0;
  const connect = async () => {
    await amqp.connect(connectionDetails, async function (error, connection) {
      if (error) {
        logger.logError(error.message, {
          location: "amqp.connect",
          connectionDetails
        });
        if (connectionAttempts < config.rabbitmq.maxReconnectionAttempts) {
          console.log("RABBITMQ - Connection attempt " + connectionAttempts);
          connectionAttempts++;
          // try to connect again after some amount of time
          return setTimeout(connect, config.rabbitmq.reconnectionInterval, connectionDetails);
        }
        console.log("RABBITMQ - Unable to connect");
        sendNotificationEmail();
        return;
      }
      connection.on("error", (error) => {
        logger.logError(error.message, {
          location: "connection.on error",
        });
      });
      connection.on("close", () => {
        logger.logError("RABBITMQ - Reconnecting", {
          location: "connection.on close",
        });
        if (connectionAttempts < config.rabbitmq.maxReconnectionAttempts) {
          console.log("RABBITMQ - Connection attempt " + connectionAttempts);
          connectionAttempts++;
          // try to connect again after some amount of time
          return setTimeout(connect, config.rabbitmq.reconnectionInterval, connectionDetails);
        }
        console.log("RABBITMQ - Unable to reconnect");
        sendNotificationEmail();
        return;
      });
      console.log("RABBITMQ - Connected");
      connectionAttempts = 0;
      await startConsumer(connection);
    });
  };

  const rabbitMqEnabled = config.rabbitmq ? config.rabbitmq.enabled : false;
  if (rabbitMqEnabled) {
    if (config.rabbitmq.host) {
      connectionDetails = {
        protocol: "amqp",
        hostname: config.rabbitmq.host,
        username: config.rabbitmq.username,
        password: config.rabbitmq.password,
        heartbeat: 60,
        vhost: ("vhost" in config.rabbitmq) ? config.rabbitmq.vhost : "/",
      };
      if (config.rabbitmq.port) {
        connectionDetails = { ...connectionDetails, port: config.rabbitmq.port };
      }
      logger.logInfo("Connecting to RabbitMq", connectionDetails);
      await connect();
    }
  }
};
