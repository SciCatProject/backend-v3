#!/bin/sh
cd ../..
./node_modules/.bin/lb-sdk -d ng2universal server/server.js  ../frontend/src/app/shared/sdk
cd -
