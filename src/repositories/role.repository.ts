// 
//


import {inject} from '@loopback/core';
import {
  DefaultCrudRepository,
  juggler,
} from '@loopback/repository';
import {RoleModel,RoleModelRelations} from '../models';


export class RoleRepository extends DefaultCrudRepository<
  RoleModel,
  typeof RoleModel.prototype.id,
  RoleModelRelations
> {

  constructor(
    @inject('datasources.mongo') dataSource: juggler.DataSource,
  ) {
    super(RoleModel, dataSource);
  }
}
