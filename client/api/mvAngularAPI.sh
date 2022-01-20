#!/bin/bash 

cd $SCICAT_HOME/backend/client/

echo "copying sdk"
cp -r $SCICAT_HOME/frontend/src/app/shared/sdk/services/custom/User.ts $SCICAT_HOME/sdk/services/custom/User.ts
rm -rf $SCICAT_HOME/frontend/src/app/shared/sdk 
cp -r api/angular2/sdk $SCICAT_HOME/frontend/src/app/shared/sdk/ 
cp $SCICAT_HOME/sdk/services/custom/User.ts $SCICAT_HOME/frontend/src/app/shared/sdk/services/custom/User.ts
echo "done"
