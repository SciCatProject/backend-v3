"use strict";
const config = require("../../server/config.local");
const superagent = require("superagent");
  
class M365Authenticate {
  constructor(config){
    this.tenantId = config.auth.tenantId || "";
    this.clientId = config.auth.clientId || "";
    this.clientSecret = config.auth.clientSecret || "";
    this.aadEndpoint = config.aadEndpoint || "";
    this.graphEndpoint = config.graphEndpoint || "";
  }

  async getAuthToken() {
    const formData = {
      "grant_type": "client_credentials",
      scope: `${this.graphEndpoint}/.default`,
      "client_id": this.clientId,
      "client_secret": this.clientSecret,
    };
 
    const tokenObject = await superagent.post(
      `${this.aadEndpoint}/${this.tenantId}/oauth2/v2.0/token`)
      .set({ "Content-Type": "application/x-www-form-urlencoded" })
      .send(formData);
    return tokenObject.body.access_token;
  }

}

class M365Email {
  constructor(authClass) {
    this.authClass = authClass;
    this.graphEndpoint = authClass.graphEndpoint;
  }

  createRecipients(rcpts) {
    return rcpts.filter(r => r).map((rcpt) => {
      return {
        emailAddress: {
          address: rcpt,
        },
      };
    });
  }
   
  createEmailAsJson(rcpts, body, from, replyTo, subject) {
    let messageAsJson = {
      message: {
        subject: subject,
        from: {
          emailAddress: { address: from }
        },
        replyTo: [{
          emailAddress: { address: replyTo }
        }],
        body: {
          contentType: "HTML",
          content: body,
        },
      },
    };
   
    messageAsJson = this.addRecipients(messageAsJson, rcpts);
    return messageAsJson;
  }
  
  async sendNotification(from, message){
    const accessToken = await this.authClass.getAuthToken();
    try {
      const response = await superagent.post(
        `${this.graphEndpoint}/v1.0/users/${from}/sendMail`)
        .set({ Authorization: `Bearer ${accessToken}` })
        .set({ "Content-Type": "application/json" })
        .send(message);
   
      console.log("sendNotification status", response.statusText);
    } catch (error) {
      console.log(error);
    }
  }

  addRecipients(messageBody, rcpts = {}) {
    const cloned = Object.assign({}, messageBody);
   
    Object.keys(rcpts).forEach((element) => {
      const recipients = this.createRecipients(rcpts[element]);
      if (recipients.length > 0) {
        cloned.message[element + "Recipients"] = recipients;
      }
    });
   
    return cloned;
  }

}


exports.sendEmailM365 = async(to, cc, subjectText, mailText, e, next, html = null) => {
  try {
    const client = new M365Authenticate(config.smtpSettings);
    const emailSender = new M365Email(client);
    const messageCofig = config.smtpMessage;
    const message = emailSender.createEmailAsJson({ to: to.split(","), cc: cc ?cc.split(","): [] }, html, messageCofig.from, messageCofig.replyTo, messageCofig.subject);
    emailSender.sendNotification(messageCofig.from, message);

  } catch (err) {
    console.log(err);
  }
  return next && next(e);
};
