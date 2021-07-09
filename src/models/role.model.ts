import {Entity, model, property} from '@loopback/repository';
import { now } from 'moment-timezone';

@model({
  settings: {
    strict: false
  }
})
export class RoleModel extends Entity {
  @property({
    type: 'string',
    id: true,
    generated: true,
    updateOnly: true,
    mongodb: {dataType: 'ObjectId'}
  })
  id?: string;

  @property({
    type: 'string',
    required: true,
  })
  name: string;

  @property({
    type: 'string',
  })
  description?: string;

  @property({
    type: 'date',
    defaultFn: now,
  })
  created?: string;

  @property({
    type: 'date',
    defaultFn: now,
  })
  modified?: string;

  // Define well-known properties here

  // Indexer property to allow additional data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [prop: string]: any;

  constructor(data?: Partial<RoleModel>) {
    super(data);
  }
}

export interface RoleModelRelations {
  // describe navigational properties here
}

export type RoleWithRelations = RoleModel & RoleModelRelations;
