import { authenticate, AuthenticationComponent, TokenService, UserService } from '@loopback/authentication';
import {
  Count,
  CountSchema,
  Filter,
  FilterExcludingWhere,
  repository,
  Where,
} from '@loopback/repository';
import {
  post,
  param,
  get,
  getModelSchemaRef,
  patch,
  put,
  del,
  requestBody,
  response,
} from '@loopback/rest';
import {inject} from '@loopback/context';
import {UserModel} from '../models';
import {UserRepository, CredentialsRequestBody, Credentials} from '../repositories';
import { PasswordHasherBindings, UserServiceBindings } from '../utils';
import { PasswordHasher, AppUserService } from '../services';
import { TokenServiceBindings } from '@loopback/authentication-jwt';
import {SecurityBindings, securityId, UserProfile} from '@loopback/security';

export class UserController {
  constructor(
    @repository(UserRepository)
    public userRepository: UserRepository,
    @inject(PasswordHasherBindings.PASSWORD_HASHER)
    public passwordHasher: PasswordHasher,
    @inject(TokenServiceBindings.TOKEN_SERVICE)
    public jwtService: TokenService,
    @inject(TokenServiceBindings.TOKEN_SECRET)
    private jwtSecret: string,
    @inject(UserServiceBindings.USER_SERVICE)
    public userService: AppUserService,
    @inject(SecurityBindings.USER, {optional: true})
    private user: UserProfile,
  ) {}

  /*
   * List of user in the system according to filter applied
   */
  @get('/users',{
    description: "retrieve a list of users",
    parameters: [
      {
        name: "filter",
        in: "path",
        schema: {
          type: "object"
        }
      }
    ],
    responses: {
      '200': {
        description: "Return the full list of users",
        content: {
          "application/json": {
            schema: {
              type: "array",
              items: getModelSchemaRef(UserModel, {includeRelations: true}),
            }
          }
        }
      }
    }
  })
  @authenticate('jwt')
  async find(
    @param.filter(UserModel) filter?: Filter<UserModel>,
  ): Promise<UserModel[]> {
    return this.userRepository.find(filter);
  }

  /*
   * Number of users in the system according to fitler applied
   */
  @get('/users/count',{
    description: "return count of selected users",
    parameters: [
      {
        name: "filters",
        in: "path",
        schema: {
          type: "object",
        }
      }
    ],
    responses: {
      '200': {
        description: "Return count of selected users",
        content: {
          "application/json": {
            schema: CountSchema
          }
        }
      }
    }
  })
  @authenticate('jwt')
  async count(
    @param.filter(UserModel) filter?: Filter<UserModel>,
  ): Promise<Count> {
    return this.userRepository.count(filter);
  }

  @get('/users/{id}',{
    parameters: [
      {
        name: "id",
        in: "path",
        schema: {
          type: "string",
          required: ["true"],
          description: "User id",
        }
      }
    ],
    responses: {
      '200': {
        description: "User model instance",
        content: {
          "application/json": {
            schema: {
              type: getModelSchemaRef(UserModel, {includeRelations: true}),
            }
          }
        }
      }
    }
  })
  @authenticate('jwt')
  async findById(
    @param.path.string('id') id: string,
    @param.filter(UserModel, {exclude: 'where'}) filter?: FilterExcludingWhere<UserModel>
  ): Promise<UserModel> {
    return this.userRepository.findById(id, filter);
  }

  @post('/users/login', {
    responses: {
      '200': {
        description: 'Token',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                token: {
                  type: 'string',
                },
              },
            },
          },
        },
      },
    },
  })
  async login(
    @requestBody(CredentialsRequestBody) credentials: Credentials,
  ): Promise<{token: string}> {
    // ensure the user exists, and the password is correct
    const user = await this.userService.verifyCredentials(credentials);

    // convert a User object into a UserProfile object (reduced set of properties)
    const userProfile = this.userService.convertToUserProfile(user);

    // create a JSON Web Token based on the user profile
    const token = await this.jwtService.generateToken(userProfile);

    return {token};
  }

  @authenticate('jwt')
  @get('/users/me', {
    responses: {
      '200': {
        description: 'Return current user',
        content: {
          'application/json': {
            schema: {
              type: 'string',
            },
          },
        },
      },
    },
  })
  async myself(): Promise<string> {
    return this.user[securityId];
  }

  @authenticate('jwt')
  @get('/users/jwt', {
    responses: {
      '200': {
        description: 'Return current user jwt',
        content: {
          'application/json': {
            schema: {
              type: 'string',
            },
          },
        },
      },
    },
  })
  async myJwt(): Promise<string> {
    return this.jwtSecret;
  }
  
  @authenticate('jwt')
  @get('/users/logout', {
    responses: {
      '200': {
        description: 'Logout current user',
        content: {
          'application/json': {
            schema: {
              type: 'boolean',
            },
          },
        },
      },
    },
  })
  async logout(): Promise<string> {
    return this.jwtService.revokeToken();
  }

  @authenticate('jwt')
  @post('/users/change-password', {
    responses: {
      '200': {
        description: 'Change user password',
        content: {
          'application/json': {
            schema: {
              type: 'boolean',
            },
          },
        },
      },
    },
  })
  async changePassword(
    @requestBody(ChangePasswordRequestBody) changePassword: ChangePassword,
  ): Promise<boolean> {
    // extract credentials from changePassword info
    const credentials = this.userServices.extractOldCredentials(changePassword);

    // ensure the user exists, and the password is correct
    const user = await this.userService.verifyCredentials(credentials);

    // change user password
    const passwordChanged = await this.userService.changePassword(user,changePassword)

    if (passwordChanged) {
      return this.jwtService.revokeToken();

    }
    return false;
  }
}
