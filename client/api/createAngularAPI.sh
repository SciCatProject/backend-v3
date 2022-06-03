#!/bin/sh
cd ../../..
./backend/node_modules/.bin/lb-sdk backend/server/server.js  ./frontend/src/app/shared/sdk
cd -
