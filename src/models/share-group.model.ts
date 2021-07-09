import {model, property} from '@loopback/repository';
import {MongoQueryableModel} from '.';

@model({
  settings: {
    strict: false,
    description: 'Definition of groups to share datasets between scicat users',
    plural: 'ShareGroups',
    idInjection: false
  }
})
export class ShareGroup extends MongoQueryableModel {
  @property({
    type: 'string',
    description: "group short name id",
  })
  groupID?: string;

  @property({
    type: 'array',
    description: "Defines the emails of users that data is shared with",
    itemType: 'string',
  })
  members?: string[];

  @property({
    type: 'array',
    description: "Defines the datasets which are shared",
    itemType: 'string',
  })
  datasets?: string[];

  // Define well-known properties here

  // Indexer property to allow additional data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [prop: string]: any;

  constructor(data?: Partial<ShareGroup>) {
    super(data);
  }
}

export interface ShareGroupRelations {
  // describe navigational properties here
}

export type ShareGroupWithRelations = ShareGroup & ShareGroupRelations;
