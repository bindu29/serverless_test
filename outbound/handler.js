var {
  apiHelpers,
  commonHelpers,
  secretsManagerHelpers,
  loghelpers,
} = require("./src/helpers");
var { secretsManager, validateInitialConfigs } = require("./src/config");
var { metadataHandlers, outboundApiHandlers } = require("./src/api");

/**
 * Default index function
 */
const index = async (event, context, callback) => {
  context.callbackWaitsForEmptyEventLoop = false;

  let responseHtmlImages = {};
  responseHtmlImages.favicon =
    process.env.KPI_FAVICON || "https://kpininja.com/assets/images/favicon.png";
  responseHtmlImages.logo =
    process.env.KPI_LOGO || "https://kpininja.com/assets/images/head-logo.png";

  // Validate initial environment setup using `process.env` values
  let validationErr = validateInitialConfigs();
  if (validationErr.code != null && validationErr.message != null) {
    let errMsg = validationErr.message;
    loghelpers.logError(errMsg, validationErr);
    let statusCode = 503;
    let html = apiHelpers.generateResponseHtml(responseHtmlImages, null, null, {
      statusCode: statusCode,
      code: validationErr.code,
      message: errMsg,
    });

    callback(
      null,
      apiHelpers.responseBuilder(
        {
          "x-request-id": commonHelpers.generateUniqueId(),
          "Content-Type": "text/html",
        },
        html,
        statusCode
      )
    );
    return;
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
    let html = apiHelpers.generateResponseHtml(responseHtmlImages, null, null, {
      statusCode: statusCode,
      code: envData.error.code,
      message: errMsg,
    });

    callback(
      null,
      apiHelpers.responseBuilder(
        {
          "x-request-id": commonHelpers.generateUniqueId(),
          "Content-Type": "text/html",
        },
        html,
        statusCode
      )
    );
    return;
  }

  loghelpers.logMessage("env fetched from AWS Secrets Manager in /: ", envData);

  let configVars = envData.data;

  if (
    typeof configVars.KPI_FAVICON != "undefined" &&
    configVars.KPI_FAVICON != "" &&
    configVars.KPI_FAVICON != null
  ) {
    responseHtmlImages.favicon = configVars.KPI_FAVICON;
  }
  if (
    typeof configVars.KPI_LOGO != "undefined" &&
    configVars.KPI_LOGO != "" &&
    configVars.KPI_LOGO != null
  ) {
    responseHtmlImages.logo = configVars.KPI_LOGO;
  }

  let statusCode = 200;
  let html = apiHelpers.generateResponseHtml(
    responseHtmlImages,
    null,
    {
      statusCode: statusCode,
      message: "KPI SSO Outbound Gateway working.",
    },
    null
  );

  let headers = {
    "Content-Type": "text/html",
  };
  return callback(null, apiHelpers.responseBuilder(headers, html, statusCode));
};

module.exports = {
  index: async (event, context, callback) => index(event, context, callback),
  metadata: async (event, context, callback) =>
    metadataHandlers.metadata(event, context, callback),
  metadataR4: async (event, context, callback) =>
    metadataHandlers.metadataR4(event, context, callback),
  authorize: async (event, context, callback) =>
    outboundApiHandlers.authorize(event, context, callback),
  token: async (event, context, callback) =>
    outboundApiHandlers.token(event, context, callback),
  verify: async (event, context, callback) =>
    outboundApiHandlers.verify(event, context, callback),
};
