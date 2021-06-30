import {Entity, model, property} from '@loopback/repository';
import { now } from 'moment-timezone';

@model({
  settings: {
    strict: false,
    validateUpsert: true,
    description: 'This is the base model for all models which want to use the fullQuery and fullFacet API calls, which depend on Mongo Query functionality.'
  }
})
export class MongoQueryableModel extends Entity {
  @property({
    type: 'ObjectID',
    id: 1,
    generated: true,
    updateOnly: true,
    mongodb: {dataType: 'ObjectId'}
  })
  id?: string;

  @property({
    type: 'string',
    index: true,
    description: 'Functional or user account name who created this instance',
  })
  createdBy?: string;

  @property({
    type: 'string',
    description: 'Functional or user account name who last updated this instance',
  })
  updatedBy?: string;

  @property({
    type: 'date',
    defaultFn: now,
  })
  createdAt?: string;

  @property({
    type: 'date',
  })
  updatedAt?: string;

  // Define well-known properties here

  // Indexer property to allow additional data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [prop: string]: any;

  constructor(data?: Partial<MongoQueryableModel>) {
    super(data);
  }
}

export interface MongoQueryableModelRelations {
  // describe navigational properties here
}

export type MongoQueryableModelWithRelations = MongoQueryableModel & MongoQueryableModelRelations;
