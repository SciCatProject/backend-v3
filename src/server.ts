import {ApplicationConfig} from '@loopback/core';
import {once} from 'events';
import express, {Request, Response} from 'express';
import * as http from 'http';
import {AddressInfo} from 'net';
import * as path from 'path';
import {CatamelApplication} from './application';

const loopback = require('loopback');
const compression = require('compression');
const cors = require('cors');
const helmet = require('helmet');

export class ExpressServer {

    private app: express.Application;
    public readonly lbApp: CatamelApplication;
    public server?: http.Server;
    public url: String;
   
    constructor(options: ApplicationConfig = {}) {
        this.app = express();
        this.lbApp = new CatamelApplication(options);

        // Middleware migrated from LoopBack 3
        this.app.use(loopback.favicon());
        this.app.use(compression());
        this.app.use(cors());
        this.app.use(helmet());

        // Mount the LB4 REST API
        this.app.use('/api', this.lbApp.requestHandler);
    }

    public async boot() {
        await this.lbApp.boot();
    }

    public async start() {
        await this.lbApp.start();
        const port = this.lbApp.restServer.config.port ?? 3000;
        const host = this.lbApp.restServer.config.host ?? '127.0.0.1';
        this.server = this.app.listen(port, host);
        await once(this.server, 'listening');
        const add = <AddressInfo>this.server.address();
        this.url = `http://${add.address}:${add.port}`;
    }

    public async stop() {
        if (!this.server) return;
        await this.lbApp.stop();
        this.server.close();
        await once(this.server, 'close');
        this.server = undefined;
    }
}
