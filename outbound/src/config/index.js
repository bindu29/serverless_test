var axiosConfig = require("./axios-config");
var oauthConfig = require("./oauthConfig");
var secretsManager = require("./secretsManager");
var validateInitialConfigs = require("./validateInitialConfigs");

module.exports = {
  axios: axiosConfig,
  oauthConfig: oauthConfig,
  secretsManager: secretsManager,
  validateInitialConfigs: validateInitialConfigs,
};
