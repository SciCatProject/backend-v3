import {CommonRoutesConfig} from '../common/common.routes';
import express from 'express';
import debug from 'debug';

const debugLog: debug.IDebugger = debug('app:dataset-routes');

export class DatasetRoutes extends CommonRoutesConfig {
  constructor(app: express.Application) {
    super(app, 'DatasetRoutes');
  }

  configureRoutes() {
    
    debugLog('Dataset routes');
    this.app.route('/datasets')
      .get((req: express.Request, res: express.Response) => {
        res.status(200).send('List of datasets');
      })
      .post((req: express.Request, res: express.Response) => {
        res.status(200).send('Post to datasets');
      });

    this.app.route('/datasets/:datasetId')
      .get((req: express.Request, res: express.Response) => {
        res.status(200).send(`GET requested for dataset ${req.params.datasetId}`);
      })
      .patch((req: express.Request, res: express.Response) => {
        res.status(200).send(`PATCH requested for dataset ${req.params.datasetId}`);
      })
      .put((req: express.Request, res: express.Response) => {
        res.status(200).send(`PUT requested for dataset ${req.params.datasetId}`);
      });

    return this.app;
  }

}