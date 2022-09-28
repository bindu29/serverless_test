var {
  apiHelpers,
  commonHelpers,
  metadataDstu2Helpers,
  metadataR4Helpers,
  secretsManagerHelpers,
  loghelpers,
} = require("../helpers");
var { secretsManager, validateInitialConfigs } = require("../config");

/**
 * DSTU2 Conformance metadata
 */
const metadata = async (event, context, callback) => {
  context.callbackWaitsForEmptyEventLoop = false;

  // Validate initial environment setup using `process.env` values
  let validationErr = validateInitialConfigs();
  if (validationErr.code != null && validationErr.message != null) {
    let errMsg = validationErr.message;
    loghelpers.logError(errMsg, validationErr);
    let statusCode = 503;
    let errorData = {
      statusCode: statusCode,
      message: validationErr.message,
      code: validationErr.code,
    };

    return callback(
      null,
      apiHelpers.responseBuilder(null, JSON.stringify(errorData), statusCode)
    );
  }

  // Fetch Env credentials from AWS Secrets Manager
  let initialEnvConfigs = secretsManagerHelpers.getInitialEnvConfigs();

  const envData = await secretsManager(
    initialEnvConfigs.AWS_SECRET_NAME,
    initialEnvConfigs.AWS_SECRET_REGION,
    initialEnvConfigs.AWS_SECRET_FLAG,
    initialEnvConfigs.SECRET_KEYS
  );

  if (envData.error.code != null && envData.error.message != null) {
    let errMsg = envData.error.message;
    loghelpers.logError(errMsg, envData);
    let statusCode = 422;
    return callback(
      null,
      apiHelpers.responseBuilder(
        null,
        JSON.stringify({
          valid: false,
          error: {
            name: envData.error.code,
            message: errMsg,
          },
        }),
        statusCode
      )
    );
  }

  let configVars = envData.data;

  let acceptHeader = event.headers.Accept;

  let resContentType = "application/xml";
  let metadataContent = null;

  if (
    acceptHeader == "application/json" ||
    acceptHeader == "application/fhir+json" ||
    acceptHeader == "application/json+fhir"
  ) {
    resContentType = acceptHeader;
    metadataContent = JSON.stringify(
      metadataDstu2Helpers.generateMetadataJson(configVars)
    );
  }

  if (
    acceptHeader != "application/json" &&
    acceptHeader != "application/fhir+json" &&
    acceptHeader != "application/json+fhir"
  ) {
    metadataContent = metadataDstu2Helpers.generateMetadataXml(configVars);
  }

  let statusCode = 200;
  let headers = {
    "x-request-id": commonHelpers.generateUniqueId(),
    "Content-Type": resContentType,
  };

  callback(
    null,
    apiHelpers.responseBuilder(headers, metadataContent, statusCode)
  );
};

/**
 * STU3 / R4 CapabilityStatement metadata
 */
const metadataR4 = async (event, context, callback) => {
  context.callbackWaitsForEmptyEventLoop = false;

  // Validate initial environment setup using `process.env` values
  let validationErr = validateInitialConfigs();
  if (validationErr.code != null && validationErr.message != null) {
    let errMsg = validationErr.message;
    loghelpers.logError(errMsg, validationErr);
    let statusCode = 503;
    let errorData = {
      statusCode: statusCode,
      message: validationErr.message,
      code: validationErr.code,
    };

    return callback(
      null,
      apiHelpers.responseBuilder(null, JSON.stringify(errorData), statusCode)
    );
  }

  // Fetch Env credentials from AWS Secrets Manager
  let initialEnvConfigs = secretsManagerHelpers.getInitialEnvConfigs();

  const envData = await secretsManager(
    initialEnvConfigs.AWS_SECRET_NAME,
    initialEnvConfigs.AWS_SECRET_REGION,
    initialEnvConfigs.AWS_SECRET_FLAG,
    initialEnvConfigs.SECRET_KEYS
  );

  if (envData.error.code != null && envData.error.message != null) {
    let errMsg = envData.error.message;
    loghelpers.logError(errMsg, envData);
    let statusCode = 422;
    return callback(
      null,
      apiHelpers.responseBuilder(
        null,
        JSON.stringify({
          valid: false,
          error: {
            name: envData.error.code,
            message: errMsg,
          },
        }),
        statusCode
      )
    );
  }

  let configVars = envData.data;

  let acceptHeader = event.headers.Accept;

  let resContentType = "application/xml";
  let metadataContent = null;

  if (
    acceptHeader == "application/json" ||
    acceptHeader == "application/fhir+json" ||
    acceptHeader == "application/json+fhir"
  ) {
    resContentType = acceptHeader;
    metadataContent = JSON.stringify(
      metadataR4Helpers.generateMetadataJson(configVars)
    );
  }

  if (
    acceptHeader != "application/json" &&
    acceptHeader != "application/fhir+json" &&
    acceptHeader != "application/json+fhir"
  ) {
    metadataContent = metadataR4Helpers.generateMetadataXml(configVars);
  }

  let statusCode = 200;
  let headers = {
    "x-request-id": commonHelpers.generateUniqueId(),
    "Content-Type": resContentType,
  };

  callback(
    null,
    apiHelpers.responseBuilder(headers, metadataContent, statusCode)
  );
};

module.exports = {
  metadata: metadata,
  metadataR4: metadataR4,
};
