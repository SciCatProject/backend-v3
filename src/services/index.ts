import { SchemaObject, SchemaRef } from '@loopback/rest';

export * from './logbook.service';
export * from './encryption.service';
export * from './user.service';

export interface MessageDef {
    type: string;
    sender: string;
    content: object;
    origin_server_ts: number;
    unsigned: string;
    event_id: string;
};

export const MessageSchema: SchemaRef = {
    $ref: '/components/schema/MessageSchema',
    definitions: {
        LogbookDef: {
            title: "Message",
            properties: {
                type: {
                    type: "string",
                },
                sender: {
                    type: "string",
                },
                content: {
                    type: "object",
                },
                origin_server_ts: {
                    type: "number",
                },
                unsigned: {
                    type: "string",
                },
                event_id: {
                    type: "string",
                }
            }
        }
    }
}

export interface LogbookDef {
    name: string;
    roomId: string;
    messages: MessageDef[];
};

export const LogbookSchema: SchemaRef = {
    $ref: '/components/schema/LogbookSchema',
    definitions: {
        LogbookDef: {
            title: "Logbook",
            properties: {
                name: {
                    type: "string",
                },
                roomid: {
                    type: "string",
                },
                messages: {
                    type: "array",
                    items: MessageSchema,
                }
            }
        }
    }
}

export const sendMessageSchema: SchemaObject = {
    type: "object",
    required: ["message"],
    properties: {
      message: {
        type: "string",
      },
    },
  };

export const sendMessageRequestBody = {
    description: "The message to be sent to the room",
    required: true,
    content: {
      "application/json": { schema: sendMessageSchema },
    },
  };
  

export async function getUserProposalIds(userId) {
    const User = app.models.User;
    const UserIdentity = app.models.UserIdentity;
    const ShareGroup = app.models.ShareGroup;
    const RoleMapping = app.models.RoleMapping;
    const Role = app.models.Role;
    const Proposal = app.models.Proposal;
  
    let options = {};
  
    try {
      const user = await User.findById(userId);
      const userIdentity = await UserIdentity.findOne({
        where: { userId },
      });
  
      if (userIdentity) {
        options.currentGroups = [];
        if (userIdentity.profile) {
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
        location: "Logbook.getUserProposals",
        userId,
        options,
      });
    }
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
  