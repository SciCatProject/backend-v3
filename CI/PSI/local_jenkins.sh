#!/bin/sh

# git clone git@git.psi.ch:MELANIE/scicat-backend-psiconfig.git
# git clone git@git.psi.ch:MELANIE/scicat-backend-psisecrets.git
cp $SCICAT_HOME/scicat-backend-psisecrets/server/pass-db-qa/datasources.json envfiles/datasources.json
cp $SCICAT_HOME/scicat-backend-psisecrets/server/providers.json envfiles/providers.json
cp $SCICAT_HOME/scicat-backend-psiconfig/server/config.local.js envfiles/config.local.js
cp $SCICAT_HOME/scicat-backend-psisecrets/server/settings.json envfiles/settings.json

# cp scicat-backend-psiconfig/server/kubernetes/helm/dacat-api-server/envfiles-qa/middleware.json middleware.json
cd $SCICAT_HOME/scicat_backend
docker build -f CI/PSI/Dockerfile.test . --network=host -t scicat_backend_test
docker run --net=host -t scicat_backend_test
