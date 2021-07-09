// 
// template taken from PSI example code and from loopback 4 examples
//

import {belongsTo, Entity, model, property} from '@loopback/repository';
import {UserModel} from './user.model'

import { userInfo } from 'os';
@model()
export class UserCredentialsModel extends Entity {
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

  @belongsTo(() => UserModel,
   {}, //relation metadata goes in here
   {// property definition goes in here
    mongodb: {dataType: 'ObjectId'}
  })
  userId: string;

  constructor(data?: Partial<UserCredentialsModel>) {
    super(data);
  }
}

export interface UserCredentialsModelRelations {
  // describe navigational properties here
}

export type UserCredentialsWithRelations = UserCredentialsModel &
  UserCredentialsModelRelations;
