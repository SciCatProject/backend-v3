// Copyright IBM Corp. 2019,2020. All Rights Reserved.
// Node module: loopback4-example-shopping
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

import {Getter, inject} from '@loopback/core';
import {SchemaObject} from '@loopback/rest';
import {
  DefaultCrudRepository,
  HasManyRepositoryFactory,
  HasOneRepositoryFactory,
  juggler,
  repository,
} from '@loopback/repository';
import {UserModel, UserCredentialsModel, RoleModel} from '../models';
import {UserCredentialsRepository, RoleRepository} from '.';
import { Credentials, CredentialsRequestBody } from '../utils';


export class UserRepository extends DefaultCrudRepository<
  UserModel,
  typeof UserModel.prototype.id
> {

  public readonly userCredentials: HasOneRepositoryFactory<
    UserCredentialsModel,
    typeof UserModel.prototype.id
  >;

  public readonly roles: HasManyRepositoryFactory<
    RoleModel,
    typeof UserModel.prototype.id
  >;

  constructor(
    @inject('datasources.mongo') dataSource: juggler.DataSource,
    @repository.getter('UserCredentialsRepository')
    protected userCredentialsRepositoryGetter: Getter<
      UserCredentialsRepository
    >,
    @repository.getter('RoleRepository')
    protected roleRepositoryGetter: Getter<
      RoleRepository
    >,
  ) {
    super(UserModel, dataSource);
    this.userCredentials = this.createHasOneRepositoryFactoryFor(
      'userCredentials',
      userCredentialsRepositoryGetter,
    );
    this.roles = this.createHasManyRepositoryFactoryFor(
      'roleModel',
      roleRepositoryGetter,
    );
  }

  async findCredentials(
    userId: typeof UserModel.prototype.id,
  ): Promise<UserCredentialsModel | undefined> {
    try {
      return await this.userCredentials(userId).get();
    } catch (err) {
      if (err.code === 'ENTITY_NOT_FOUND') {
        return undefined;
      }
      throw err;
    }
  }
}
