// Uncomment these imports to begin using these cool features!

//import { authenticate } from "@loopback/authentication";
import { inject, intercept } from "@loopback/core";
import { Null, repository } from "@loopback/repository";
import {
  api,
  get,
  getModelSchemaRef,
  jsonToSchemaObject,
  MIDDLEWARE_INTERCEPTOR_NAMESPACE,
  param,
  post,
  requestBody,
  SchemaObject,
} from "@loopback/rest";
import { UserRepository } from "../repositories";
import { LogbookDef, LogbookSchema, MessageDef, MessageSchema, LogbookService, sendMessageRequestBody } from "../services";
import { TokenServiceBindings } from "@loopback/authentication-jwt";
import { SecurityBindings, securityId, UserProfile } from "@loopback/security";
import { authenticate, AuthenticationComponent, TokenService, UserService } from '@loopback/authentication';
import { getUserProposalIds, sortMessages } from "../utils";
import { ProposalModel } from "../models";
const mainConfig = require("../server/config.local")


@api({
  basePath: '/api'
})
export class LogbookController {

  logbookEnabled: boolean;
  accessToken: string = "";
  username: string = "";
  password: string = "";

  constructor(
    @inject("service.logbook") protected logbookService: LogbookService,
    @repository(UserRepository)
    public userRepository: UserRepository,
    @inject(TokenServiceBindings.TOKEN_SECRET)
    private jwtSecret: string,
    @inject(SecurityBindings.USER, {optional: true})
    private user: UserProfile,
  ) {
    this.logbookEnabled = mainConfig.logbook && mainConfig.logbook.enabled ? mainConfig.logbook.enabled : false;
    this.username = mainConfig.logbook && mainConfig.logbook.username ? mainConfig.logbook.username : "";
    this.password = mainConfig.logbook && mainConfig.logbook.password ? mainConfig.logbook.password : "";
  }

  @authenticate('jwt')
  @get('/Logbooks', {
    parameters: [
      {
        name: "filters",
        in: "path",
        schema: {
          type: "string",
        }
      }
    ],
    responses: {
      '200': {
        description: "Array of Logbook model instances",
        content: {
          "application/json": {
            schema: {
              type: "array",
              items: LogbookSchema,
            }
          }
        }
      }
    }
  })
  async find(
    @param.query.string("filter") filter?: string | undefined,
  ): Promise<LogbookDef[] | undefined> {
    if (this.logbookEnabled) {
      while (true) {
        try {
          console.log("Fetching Logbooks");
          const results = await this.logbookService.find(filter!,this.accessToken);
          const nonEmptyLogbooks = results.filter(
            (logbook: LogbookDef) => logbook.messages.length !== 0
          );  
          const emptyLogbooks = results.filter(
            (logbook: LogbookDef) => logbook.messages.length === 0
          );  
          nonEmptyLogbooks
            .sort(
              (a: LogbookDef, b: LogbookDef) =>
                a.messages[a.messages.length - 1].origin_server_ts -
                              b.messages[b.messages.length - 1].origin_server_ts
            )
            .reverse();
          var logbooks = nonEmptyLogbooks.concat(emptyLogbooks);
          console.log("Found Logbooks " + JSON.stringify({ count: logbooks.length }));
          const proposalIds = await getUserProposalIds(this.userRepository,this.user[securityId]);
          logbooks = logbooks 
            ? logbooks.filter(({ name }) => proposalIds.includes(name))
            : [];
          console.log("User Logbooks " + JSON.stringify({ count: logbooks.length }));
          return logbooks
        } catch (err) {
          if (
            err.error &&
            (err.error.errcode === "M_UNKNOWN_TOKEN" ||
              err.error.errcode === "M_MISSING_TOKEN")
          ) {
             const loginResults = await this.logbookService.login(this.username, this.password);
             this.accessToken = loginResults.token;
            continue;
          } else {
            console.log(err.message + JSON.stringify({ location: "Logbook.find" }));
          }          
        }
      }
    }
    return [];
  }
 
  @authenticate('jwt')
  @get('/Logbooks/{name}',{
    parameters: [
      {
        name: "name",
        in: "path",
        schema: {
          type: "string",
          required: ["true"],
          description: "Name of the Logbook",
        }
      },
      {
        name: "filter",
        in: "query",
        schema: {
          type: "string",
          required: ["false"],
          description: "Filter json object, keys: textSearch, showBotMessages, showUserMessages, showImages, skip, limit, sortField",
        }
      }
    ],
    responses: {
      '200': {
        description: "Logbook model instance",
        content: {
          "application/json": {
            schema: {
              type: LogbookSchema,
            }
          }
        }
      }
    }
  })
  async findByName(
    @param.path.string("name") logbookName: string,
    @param.query.string("filter") filter?: string | undefined,
  ): Promise<LogbookDef | undefined> {
    if (this.logbookEnabled) {
      while (true) {
        try {
          console.log("Fetching logbook " + JSON.stringify({ logbookName, filter }));
          const results = await this.logbookService.findByName(logbookName,filter!,this.accessToken);
          console.log("Found Logbook " + JSON.stringify({ name: logbookName }));
          const { skip, limit, sortField } = JSON.parse(filter!);
          const proposalIds = await getUserProposalIds(this);
          var logbook = proposalIds.includes(results.name) ? results : null;
          console.log("User Logbook " + JSON.stringify({ name: (logbook ? logbook.name : "" )}));
          console.log("Applying filters " + JSON.stringify({ skip, limit, sortField }));
          if (!!sortField && sortField.indexOf(":") > 0) {
            logbook!.messages = sortMessages(
              logbook!.messages,
              sortField
            )!;
          }
          if (skip >= 0 && limit >= 0) {
            const end = skip + limit;
            const messages = logbook!.messages.slice(skip, end);
            return { ...logbook!, messages };
          }
          return logbook!;
        } catch (err) {
          if (
            err.error &&
            (err.error.errcode === "M_UNKNOWN_TOKEN" ||
              err.error.errcode === "M_MISSING_TOKEN")
          ) {
            const loginResults = await this.logbookService.login(this.username, this.password);
            this.accessToken = loginResults.token;
            continue;
          } else {
            console.log(err.message + JSON.stringify({
              location: "Logbook.findByName",
              logbookName,
              filter,
            }));
          }
        }
      }
    }
  }
  
  @authenticate('jwt')
  @post('/Logbooks/{name}/message',{
    description: "Send message to a logbook",
    parameters: [
      {
        name: "name",
        in: "path",
        schema: {
          type: "string",
          required: ["true"],
          description: "Name of the Logbook",
        }
      }
    ],
    requestBody: {
      content: {
        "application/json": {
          schema: {
            type: "object",
            required: ["true"],
            description: "JSON object with the key message"
          }
        }
      }
    },
    responses: {
      '200': {
        description: "Object containing the event id of the message",
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                event_id: {
                  type: "string",
                }
              }
            }
          }
        }
      }
    }
  })
  async sendMessage(
    @param.path.string("name") name: string,
    @requestBody(sendMessageRequestBody) data: { [message: string]: string },
  ): Promise<{ event_id: string} | undefined> {
    if (this.logbookEnabled) {
      while (true) {
        try {
          const accessToken = await this.logbookService.login(this.username, this.password);
          console.log("Sending message " + JSON.stringify({ name, data }));
          const results = await this.logbookService.sendMessage(name,data.message,this.accessToken)
          console.log("Message sent " + JSON.stringify({ name, eventId: results.event_id }));
          return results;
        } catch (err) {
          console.log(err.message + JSON.stringify({
            location: "Logbook.sendMessage",
            name,
            data,
          }));
        }
      }
    }
  }

  private async getUserProposalIds(): Promise<ProposalModel> {
  
    let options = {};
  
    try {
      const userInfo = await this.userRepository.findById(this.user[securityId]);

      if (userInfo) {
        options.currentGroups = [];
        if (userInfo.profile) {
          let groups = userIdentity.profile.accessGroups;
          if (!groups) {
            groups = [];
          }
          const regex = new RegExp(userIdentity.profile.email, "i");
  
          const shareGroup = await ShareGroup.find({
            where: { members: { regexp: regex } },
          });
          groups = [...groups, ...shareGroup.map(({ id }) => String(id))];
          options.currentGroups = groups;
        }
      } else {
        const roleMapping = await RoleMapping.find(
          { where: { principalId: String(userId) } },
          options
        );
        const roleIdList = roleMapping.map((instance) => instance.roleId);
  
        const role = await Role.find({
          where: { id: { inq: roleIdList } },
        });
        const roleNameList = role.map((instance) => instance.name);
        roleNameList.push(user.username);
        options.currentGroups = roleNameList;
      }
  
      const proposals = await Proposal.find({
        where: { ownerGroup: { inq: options.currentGroups } },
      });
      return proposals.map((proposal) => proposal.proposalId);
    } catch (err) {
      logger.logError(err.message, {
        location: "Logbook.getUserProposalsIds",
        this.user.userId
        options,
      });
    };
  }
  
  export function sortMessages(messages: MessageDef[], sortField: string) {
  const [column, direction] = sortField.split(":");
  const sorted = messages.sort(
    (a, b):number => {
      switch (column) {
        case "timestamp": {
          return a.origin_server_ts - b.origin_server_ts;
        }
        case "sender": {
          if (a.sender.replace("@", "") < b.sender.replace("@", "")) {
            return -1;
          }
          if (a.sender.replace("@", "") > b.sender.replace("@", "")) {
            return 1;
          }
        }
        case "entry": {
          if (a.content.body < b.content.body) {
            return -1;
          }
          if (a.content.body > b.content.body) {
            return 1;
          }
        }
      }
      return 0;
    }
  );
  switch (direction) {
    case "asc": {
      return sorted;
    }
    case "desc": {
      return sorted.reverse();
    }
  }
  }
}

