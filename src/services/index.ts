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
  

  