import {model, property} from '@loopback/repository';
import {MongoQueryableModel} from '.';

@model({
  settings: {
    strict: true,
    description: 'This is the base model for all models which \'belong\' to entities like pgroups. It is crucial to implemtn a user dependent access control to datasets or other ownable documents.',
    idInjection: false
  }
})
export class Ownable extends MongoQueryableModel {
  @property({
    type: 'string',
    required: true,
    index: true,
    description: 'Defines the group which owns the data, and therefore has unrestricted access to this data. Usually a pgroup like p12151',
  })
  ownerGroup: string;

  @property({
    type: 'array',
    index: true,
    description: 'Optional additional groups which have read access to the data. Users which are member in one of the groups listed here are allowed to access this data. The special group \'public\' makes data available to all users',
    itemType: 'string',
  })
  accessGroups?: string[];


  constructor(data?: Partial<Ownable>) {
    super(data);
  }
}

export interface OwnableRelations {
  // describe navigational properties here
}

export type OwnableWithRelations = Ownable & OwnableRelations;
