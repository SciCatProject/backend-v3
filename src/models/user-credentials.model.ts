// 
// template taken from PSI example code and from loopback 4 examples
//

import {belongsTo, Entity, model, property} from '@loopback/repository';
import {User} from './user.model'

import { userInfo } from 'os';
@model()
export class UserCredentials extends Entity {
  @property({
    type: 'string',
    id: true,
    mongodb: {dataType: 'ObjectID'},
  })
  id: string;

  @property({
    type: 'string',
    required: true,
  })
  password: string;

  @belongsTo(() => User,
   {}, //relation metadata goes in here
   {// property definition goes in here
    mongodb: {dataType: 'ObjectId'}
  })
  userId: string;

  constructor(data?: Partial<UserCredentials>) {
    super(data);
  }
}

export interface UserCredentialsRelations {
  // describe navigational properties here
}

export type UserCredentialsWithRelations = UserCredentials &
  UserCredentialsRelations;
