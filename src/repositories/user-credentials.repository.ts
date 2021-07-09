import {inject} from '@loopback/core';
import {DefaultCrudRepository, juggler} from '@loopback/repository';
import {UserCredentialsModel, UserCredentialsModelRelations} from '../models';

export class UserCredentialsRepository extends DefaultCrudRepository<
  UserCredentialsModel,
  typeof UserCredentialsModel.prototype.id,
  UserCredentialsModelRelations
> {
  constructor(
    @inject('datasources.mongo') dataSource: juggler.DataSource
  ) {
    super(UserCredentialsModel, dataSource);
  }
}
