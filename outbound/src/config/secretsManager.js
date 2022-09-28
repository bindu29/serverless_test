"use strict";

let AWS = require("aws-sdk");

/**
 * Uses AWS Secrets Manager to retrieve a secret
 * @param {String} secretName Secret store name
 * @param {String} region Region
 * @param {Boolean} keyFlag Flag for use of access id & secret access key. If `true`, it will use access id & secret access key, otherwise not
 * @param {Object} secretKeys Secret keys to be used in conjunction with `keyFlag`. If `keyFlag` is `true`, `secretKeys` is required
 * @returns Returns secret manager object
 */
const secretsManager = async (
  secretName,
  region,
  keyFlag = false,
  secretKeys = {}
) => {
  let response = {};
  response.error = {};
  response.error.code = null;
  response.error.message = null;
  response.data = null;
  response.dataStr = null;
  const config = {
    region: region,
  };

  if (keyFlag == 1) {
    config.accessKeyId = secretKeys.AWS_ACCESS_KEY_ID;
    config.secretAccessKey = secretKeys.AWS_SECRET_ACCESS_KEY;
  }

  let SM = new AWS.SecretsManager(config);

  try {
    let secretValue = await SM.getSecretValue({
      SecretId: secretName,
    }).promise();

    if ("SecretString" in secretValue) {
      response.data = JSON.parse(secretValue.SecretString);
    } else {
      let buff = Buffer.from(secretValue.SecretBinary, "base64");
      response.data = JSON.parse(buff.toString("ascii"));
    }

    let secretsString = "";
    Object.keys(response.data).forEach((key) => {
      secretsString += `${key}=${response.data[key]}\n`;
    });
    response.dataStr = secretsString;
  } catch (err) {
    response.error.message = err.message;
    response.error.code = err.code;
  }
  return response;
};

module.exports = secretsManager;
