const config = require("./app.json");

// No ambiente EAS, GOOGLE_SERVICES_JSON é um arquivo secreto. Localmente, o
// mesmo app.json continua usando o arquivo ignorado pelo Git.
module.exports = {
  ...config,
  expo: {
    ...config.expo,
    android: {
      ...config.expo.android,
      googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? "./google-services.json"
    }
  }
};
