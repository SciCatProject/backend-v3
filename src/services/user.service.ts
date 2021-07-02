// Copyright IBM Corp. 2019,2020. All Rights Reserved.
// Node module: loopback4-example-shopping
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

import {UserService} from '@loopback/authentication';
import {inject} from '@loopback/context';
import {repository} from '@loopback/repository';
import {HttpErrors} from '@loopback/rest';
import {securityId, UserProfile} from '@loopback/security';
import {PasswordHasherBindings} from '../utils';
import {UserModel} from '../models/user.model';
import {Credentials, UserRepository} from '../repositories/user.repository';
import {PasswordHasher} from '.';

export class AppUserService implements UserService<UserModel, Credentials> {
  constructor(
    @repository(UserRepository) public userRepository: UserRepository,
    @inject(PasswordHasherBindings.PASSWORD_HASHER)
    public passwordHasher: PasswordHasher,
  ) {}


  async verifyCredentials(credentials: Credentials): Promise<UserModel> {
    const {username, password} = credentials;
    const invalidCredentialsError = 'Invalid email or password.';

    if (!username) {
      throw new HttpErrors.Unauthorized(invalidCredentialsError);
    }
    const foundUser = await this.userRepository.findOne({
      where: {or: [{email: username}, {username: username}]}
    });
    if (!foundUser) {
      throw new HttpErrors.Unauthorized(invalidCredentialsError);
    }

    const credentialsFound = await this.userRepository.findCredentials(
      foundUser.id,
    );
    if (!credentialsFound) {
      throw new HttpErrors.Unauthorized(invalidCredentialsError);
    }

    const passwordMatched = await this.passwordHasher.comparePassword(
      password,
      credentialsFound.password,
    );

    if (!passwordMatched) {
      throw new HttpErrors.Unauthorized(invalidCredentialsError);
    }

    return foundUser;
  }

  convertToUserProfile(user: UserModel): UserProfile {
    //console.error("Inside convertToUserProfile:"+JSON.stringify(user,null,4))
    // since first name and lastName are optional, no error is thrown if not provided
    const userProfile = {
      [securityId]: user.id,
      name: user.username,
      id: user.id,
      roles: user.roles,
      email: user.email
    };
    // console.error("convertToUserProfile:",user,userProfile)
    return userProfile;
  }
}
