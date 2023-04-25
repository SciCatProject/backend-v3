"use strict";

const MongoStore = require("connect-mongo");

exports.sessionStoreBuilder = (app) =>
  MongoStore.create({
    mongoUrl: app.datasources.mongo.settings.url
  });
