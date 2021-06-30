import {inject, lifeCycleObserver, ValueOrPromise} from '@loopback/core';
import {AnyObject, juggler} from '@loopback/repository';

const config = {
  "name": "mongo",
  "connector": "mongodb",
  "url": "",
  "host": "mongodb",
  "port": 27017,
  "user": "",
  "password": "",
  "database": "dacat",
  "useNewUrlParser": true,
  "useUnifiedTopology": true,
  "allowExtendedOperators":true
}

/*
 * update the mongodb configuration
 * although I am not sure how this happens
 */
function updateConfig(dsConfig: AnyObject) {
  return dsConfig;
}


@lifeCycleObserver('datasource')
export class MongoDataSource extends juggler.DataSource {
  static dataSourceName = 'mongo';

  constructor(
    @inject('datasources.config.mongo', {optional: true})
    dsConfig: AnyObject = config,
  ) {
    super(updateConfig(dsConfig));
  }

  /**
   * Disconnect the datasource when application is stopped. This allows the
   * application to be shut down gracefully.
   */
  stop(): ValueOrPromise<void> {
    return super.disconnect();
  }
}
