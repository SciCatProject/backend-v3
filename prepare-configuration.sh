# Copy all the configuration files needed to start the server locally
cp CI/ESS/envfiles/config.ess.js server/config.local.js
cp CI/ESS/envfiles/providers.unittests.json server/providers.json
cp CI/ESS/envfiles/datasources.json server/datasources.json
cp CI/ESS/envfiles/settings.sample.json test/config/settings.json

# Change the host from mongodb to localhost for the database
sed -i -e "s/\"host\": \"mongodb\"/\"host\": \"localhost\"/g" server/datasources.json
