import {inject, lifeCycleObserver, LifeCycleObserver} from '@loopback/core';
import {juggler} from '@loopback/repository';

// it should be 'http://localhost:3030/scichatapi'
const baseURL = config.logbook.baseUrl;

const config = {
  name: 'logbook',
  connector: 'rest',
  crud: false,
  baseURL: baseUrl,
  operations: [
    {
      template: {
        method: "POST",
        url: baseURL + "/User/login",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
        },
        body: {
          type: "m.login.password",
          identifier: {
            type: "m.id.user",
            user: "{!username:string}",
          },
          password: "{!password:string}",
        },
      },
      functions: {
        login: ["username", "password"],
      }
    },
    {
      template: {
        method: "GET",
        url: baseUrl + "/Logbooks?filter={filter:string}",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          Authorization: "Bearer {!accessToken:string}",
        },
        functions: {
          find: ["filter"]
        }
      }
    },
    {
      template: {
        method: "GET",
        url: baseUrl + "/Logbooks/{name}?filter={filter:string}",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          Authorization: "Bearer {!accessToken:string}",
        },
        functions: {
          findByName: ["name","filter"]
        }
      }
    },
    {
      template: {
        method: "POST",
        url: baseUrl + "/Logbooks/{name}/message",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          Authorization: "Bearer {!accessToken:string}",
        },
        body: {
          msgtype: "m.text",
          body: "{!data:text}"
        }
        functions: {
          sendMessage: ["name","data"]
        }
      }
    }
  ]
};

// Observe application's life cycle to disconnect the datasource when
// application is stopped. This allows the application to be shut down
// gracefully. The `stop()` method is inherited from `juggler.DataSource`.
// Learn more at https://loopback.io/doc/en/lb4/Life-cycle.html
@lifeCycleObserver('datasource')
export class LogbookDataSource extends juggler.DataSource
  implements LifeCycleObserver {
  static dataSourceName = 'logbook';
  static readonly defaultConfig = config;

  constructor(
    @inject('datasources.config.logbook', {optional: true})
    dsConfig: object = config,
  ) {
    super(dsConfig);
  }
}
