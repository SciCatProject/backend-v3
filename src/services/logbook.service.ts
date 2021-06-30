import {inject, Provider} from '@loopback/core';
import {getService} from '@loopback/service-proxy';
import { LogbookDef } from '.';
import {LogbookDataSource} from '../datasources';

export interface LogbookService {
  login(
    username: string, 
    password: string,
  ): Promise<{ token: string }>;
  find(
    filter: string, 
    accessToken: string
  ): Promise<LogbookDef[]>;
  findByName(
    name: string, 
    filter: string, 
    accessToken: string
  ): Promise<LogbookDef>;
  sendMessage(
    name: string,
    data: string,
    accessToken: string,
  ): Promise<{ event_id: string }>
}

export class LogbookProvider implements Provider<LogbookService> {
  constructor(
    // logbook must match the name property in the datasource json file
    @inject('datasources.logbook')
    protected dataSource: LogbookDataSource = new LogbookDataSource(),
  ) {}

  value(): Promise<LogbookService> {
    return getService(this.dataSource);
  }
}
