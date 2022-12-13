"use strict";

const { sendEmailM365, M365Email } = require("../server/boot/graph-mail.js");
const sandbox = require("sinon").createSandbox();
const { expect } = require("chai");
const config = require("../server/config.local");

afterEach((done) => {
  sandbox.restore();
  done();
});      

describe("server.boot.graph-mail", () => {

  it("should sendEmailM365", () => {
    const sendNotificationStub = sandbox.stub(M365Email.prototype, "sendNotification");
    if (!config.smtpSettings) config.smtpSettings = {};
    sandbox.stub(config, "smtpSettings").value({
      auth: {
        tenantId: "someTenant", 
        clientId: "someClientId", 
        clientSecret: "someClientSecret"
      }
    });
    const from = "somefrom@email.com";
    if (!config.smtpMessage) config.smtpMessage = {};
    sandbox.stub(config, "smtpMessage").value({
      from: "somefrom@email.com",
      replyTo: "someto@email.com",
      subject: "this is a subject",
    });
    const body = "<h1>Test from James A</h1><p>HTML message sent via MS Graph</p>";
    sendEmailM365("some@email.com,someother@email.com", "", null, null, null, null, body);
    const expectedMessage = { 
      message:{ 
        subject:"this is a subject",
        from:{ 
          emailAddress:{ 
            address:"somefrom@email.com" 
          } 
        },
        replyTo:[
          { emailAddress:{ address:"someto@email.com" } }
        ],
        body:{ 
          contentType:"HTML",
          content:"<h1>Test from James A</h1><p>HTML message sent via MS Graph</p>" },
        toRecipients:[
          { emailAddress:{ address:"some@email.com" } },
          { emailAddress:{ address:"someother@email.com" } }
        ] 
      } 
    };
    expect(sendNotificationStub.calledWith(from, expectedMessage)).to.be.true;
  });

});
