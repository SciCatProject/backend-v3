import {Entity, model, property, hasOne} from '@loopback/repository';
import {UserCredentials} from './user-credentials.model';

/*
 * Please refer to the following page
 * for more info on id settings
 * https://loopback.io/doc/en/lb4/MongoDB-connector.html#handling-objectid
 */

@model({
  settings: {
    strict: false,
    caseSensitiveEmail: true,
    hidden: ['password', 'verificationToken'],
    maxTTL: 31556926,
    ttl: 1209600,
    strictObjectIDCoercion: true
  }
})
export class User extends Entity {
  @property({
    type: 'string',
    id: true,
    generated: true,
    updateOnly: true,
    mongodb: {dataType: 'ObjectId'}
  })
  id: string;

  @property({
    type: 'string',
  })
  realm?: string;

  @property({
    type: 'string',
  })
  username?: string;

  @property({
    type: 'string',
    required: true,
  })
  email: string;

  @property({
    type: 'boolean',
  })
  emailVerified?: boolean;

  @property({
    type: 'string',
  })
  verificationToken?: string;

  @hasOne(() => UserCredentials)
  userCredentials: UserCredentials;

  // Define well-known properties here

  // Indexer property to allow additional data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [prop: string]: any;

  constructor(data?: Partial<User>) {
    super(data);
  }
}

export interface UserRelations {
  // describe navigational properties here
}

export type UserWithRelations = User & UserRelations;
