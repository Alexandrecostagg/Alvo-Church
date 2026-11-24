// No ambiente EAS, GOOGLE_SERVICES_JSON é um arquivo secreto. Localmente, o
// mesmo app.json continua usando o arquivo ignorado pelo Git.
module.exports = ({ config }) => ({
  ...config,
  android: {
    ...config.android,
    googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? "./google-services.json"
  }
});
