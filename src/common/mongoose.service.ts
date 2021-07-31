import mongoose from 'mongoose';
import debug from 'debug';

const log: debug.IDebugger = debug('app:mongoose-service');

class MongooseService {
    private count = 0;
    private _mongooseOptions = {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 5000,
        useFindAndModify: false,
    };
    private _uri: string = 'mongodb://localhost:27017/test-db';
    private _connected: boolean = false;
    private _err: object = {};

    constructor(uri="") {
      if (uri) {
        this._uri = uri;
      }
      this.connectWithRetry();
    }

    public get options() {
      return this._mongooseOptions;
    } 

    public get uri() {
      return this._uri;
    }

    public get connect() {
      return this._connected;
    }

    public get err() {
      return this._err;
    }

    private connectWithRetry = () => {
      log('Attempting MongoDB connection (will retry if needed)');
      mongoose
        .connect(this._uri, this._mongooseOptions)
        .then(() => {
          log('MongoDB is connected');
          this._connected = true;
        })
        .catch((err) => {
          this._err = err;
          const retrySeconds = 5;
          log(
            `MongoDB connection unsuccessful (will retry #${++this.count} after ${retrySeconds} seconds):`,
            err
          );
          setTimeout(this.connectWithRetry, retrySeconds * 1000);
        });
    };
}
module.exports( MongooseService );