// utils/schemas.ts
//
// this file contains all the schemas used through the project
//

// imports
import {SchemaObject} from '@loopback/rest';

// user credentials
// username can either be an account name or an email address
export type Credentials = {
  username: string;
  password: string;
};

const CredentialsSchema: SchemaObject = {
  type: 'object',
  required: ['username', 'password'],
  properties: {
    username: {
      type: 'string',
    },
    password: {
      type: 'string',
      minLength: 8,
    },
  },
};

export const CredentialsRequestBody = {
  description: 'The input of login function',
  required: true,
  content: {
    'application/json': {schema: CredentialsSchema},
  },
};

export type ChangePassword = {
  username: string;
  oldpassword: string;
  newpassword: string;
  confirmnewpassword: string;
}

const ChangePasswordSchema: SchemaObject = {
  type: 'object',
  required: ['username', 'oldpassword','newpassword','confirmnewpassword'],
  properties: {
    username: {
      type: 'string',
    },
    oldpassword: {
      type: 'string',
      minLength: 8,
    },
    newpassword: {
      type: 'string',
      minLength: 8,
    },
    confirmnewpassword: {
      type: 'string',
      minLength: 8,
    },
  },
};

export const ChangePasswordRequestBody = {
  description: 'The input to the change password function',
  required: true,
  content: {
    'application/json': {schema: ChangePasswordSchema},
  },
};