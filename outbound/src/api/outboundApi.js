var { isEmpty } = require("lodash");
var DB = require("mysql2");
var moment = require("moment");

var {
  oauthConfig,
  axios,
  secretsManager,
  validateInitialConfigs,
} = require("../config");
var {
  apiHelpers,
  jwtHelpers,
  commonHelpers,
  encryptionHelpers,
  oauthHelpers,
  secretsManagerHelpers,
  loghelpers,
} = require("../helpers");

/**
 * OAuth2.0 authorization endpoint
 */
const authorize = async (event, context, callback) => {
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
    loghelpers.logError(errMsg + "\n validationErr = ", validationErr);
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
    loghelpers.logError(errMsg + "\n envData = ", envData);
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

  const queryStringParameters = event.queryStringParameters;
  if (
    typeof queryStringParameters == "undefined" ||
    queryStringParameters == null ||
    queryStringParameters == ""
  ) {
    let errMsg =
      "Bad Request. scope, response_type, redirect_uri, client_id, launch, hcs_id, state are required.";
    loghelpers.logError(
      errMsg + "\n queryStringParameters = ",
      queryStringParameters
    );
    let statusCode = 400;
    let html = apiHelpers.generateResponseHtml(responseHtmlImages, null, null, {
      statusCode: statusCode,
      message: errMsg,
      code: "INVALID_REQUEST",
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

  let {
    scope,
    response_type: responseType,
    redirect_uri: redirectUri,
    client_id: clientId,
    launch: launchToken,
    hcs_id: hcsId,
    state,
  } = event.queryStringParameters;

  if (responseType != "code") {
    loghelpers.logError(
      oauthConfig.error_codes.INVALID_RESPONSE_TYPE.message +
        "\n responseType = ",
      responseType
    );
    let statusCode = oauthConfig.error_codes.INVALID_RESPONSE_TYPE.statusCode;
    let html = apiHelpers.generateResponseHtml(responseHtmlImages, null, null, {
      statusCode: statusCode,
      code: "INVALID_RESPONSE_TYPE",
      message: oauthConfig.error_codes.INVALID_RESPONSE_TYPE.message,
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

  // Create a db connection pool
  const dbConPool = DB.createPool({
    host: configVars.DB_HOST,
    user: configVars.DB_USER,
    password: configVars.DB_PASS,
    database: configVars.DB_NAME,
    port: parseInt(configVars.DB_PORT, 10),
    waitForConnections: configVars.DB_WAIT_FOR_CON,
    connectionLimit: configVars.DB_MAX_CON,
    queueLimit: configVars.DB_QUERY_LIMIT,
    multipleStatements: configVars.DB_MULTIPLE_STMTS,
  });

  // now get a Promise wrapped instance of that pool
  const promisePool = dbConPool.promise();

  // Check if client id exists
  let clientIdExists = null;
  let clientIdExistsSql =
    "SELECT `root_companies_id`, `application_name`, `hcs_id`, `client_id`, `client_secret`, `grant_types`, `scope`, `created_at`, `updated_at`, `status` FROM `ob_oauth_applications` WHERE `client_id` = ?";

  loghelpers.dbLogger(configVars.NODE_ENV, clientIdExistsSql, clientId);

  try {
    [clientIdExists] = await promisePool.query(clientIdExistsSql, clientId);
  } catch (dbErr1) {
    let errMsg = "Error while checking client id in database.";
    loghelpers.logError(errMsg + "\n dbErr1 = ", dbErr1);
    let statusCode = 400;
    let errorData = {
      statusCode: statusCode,
      message: errMsg,
      code: "DB_ERROR",
    };
    let html = apiHelpers.generateResponseHtml(
      responseHtmlImages,
      null,
      null,
      errorData
    );

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

  if (
    typeof clientIdExists === "undefined" ||
    clientIdExists === null ||
    clientIdExists === "" ||
    clientIdExists.length <= 0
  ) {
    loghelpers.logError(
      oauthConfig.error_codes.INVALID_CLIENT_ID.message +
        "\n clientIdExists = ",
      clientIdExists
    );
    let statusCode = oauthConfig.error_codes.INVALID_CLIENT_ID.statusCode;
    let html = apiHelpers.generateResponseHtml(responseHtmlImages, null, null, {
      statusCode: statusCode,
      code: "INVALID_CLIENT_ID",
      message: oauthConfig.error_codes.INVALID_CLIENT_ID.message,
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

  let applicationDetails = clientIdExists[0];

  // Check if hcs id is valid if hcs id is provided
  if (
    typeof hcsId != "undefined" &&
    hcsId != "" &&
    hcsId != null &&
    applicationDetails.hcs_id != hcsId
  ) {
    loghelpers.logError(
      oauthConfig.error_codes.INVALID_EHR_SYSTEM_ID.message +
        "\n applicationDetails.hcs_id = " +
        applicationDetails.hcs_id +
        "\n hcsId = " +
        hcsId
    );
    let statusCode = oauthConfig.error_codes.INVALID_EHR_SYSTEM_ID.statusCode;
    let html = apiHelpers.generateResponseHtml(responseHtmlImages, null, null, {
      statusCode: statusCode,
      code: "INVALID_EHR_SYSTEM_ID",
      message: oauthConfig.error_codes.INVALID_EHR_SYSTEM_ID.message,
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

  // Check if sent launch code already exists
  let launchTokenExists = null;
  let launchTokenExistsSql =
    "SELECT `proxy_id`, `root_companies_id`, `client_id`, `launch_token`, `scope`, `context_tokens`, `token_used`, `created_at`, `updated_at` FROM `ob_oauth_proxy` WHERE `client_id` = ? AND `launch_token` = ?";
  let launchTokenExistsSqlData = [clientId, launchToken];

  loghelpers.dbLogger(
    configVars.NODE_ENV,
    launchTokenExistsSql,
    launchTokenExistsSqlData
  );

  try {
    [launchTokenExists] = await promisePool.query(
      launchTokenExistsSql,
      launchTokenExistsSqlData
    );
  } catch (dbErr2) {
    let errMsg = "Error while checking launch token in database.";
    loghelpers.logError(errMsg + "\n dbErr2 = ", dbErr2);
    let statusCode = 400;
    let errorData = {
      statusCode: statusCode,
      message: errMsg,
      code: "DB_ERROR",
    };
    let html = apiHelpers.generateResponseHtml(
      responseHtmlImages,
      null,
      null,
      errorData
    );

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

  if (
    typeof launchTokenExists != "undefined" &&
    launchTokenExists != null &&
    launchTokenExists != "" &&
    launchTokenExists.length > 0
  ) {
    loghelpers.logError(
      oauthConfig.error_codes.INVALID_LAUNCH_TOKEN.message +
        "\n launchTokenExists = ",
      launchTokenExists
    );
    let statusCode = oauthConfig.error_codes.INVALID_LAUNCH_TOKEN.statusCode;
    let html = apiHelpers.generateResponseHtml(responseHtmlImages, null, null, {
      statusCode: statusCode,
      code: "INVALID_LAUNCH_TOKEN",
      message: oauthConfig.error_codes.INVALID_LAUNCH_TOKEN.message,
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

  // Fetch kpi token from kpi proxy server
  let kpiResponse = null;
  try {
    let params = {
      launchToken: launchToken,
    };
    let kpiProxyUrl = configVars.KPI_PROXY_ENDPOINT;
    kpiResponse = await axios.get(kpiProxyUrl, {
      params: params,
    });
    if (
      kpiResponse.data &&
      Object.keys(kpiResponse.data.results).length === 0 &&
      kpiResponse.data.results.constructor === Object
    ) {
      let errMsg = "KPI Proxy response is invalid";
      loghelpers.logError(errMsg + "\n kpiResponse = ", kpiResponse);
      let statusCode = 406;
      let html = apiHelpers.generateResponseHtml(
        responseHtmlImages,
        null,
        null,
        {
          statusCode: statusCode,
          code: "NOT ACCEPTABLE",
          message: errMsg,
        }
      );

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
  } catch (proxyApiErr) {
    let errMsg = "Error while getting KPI Proxy response";
    loghelpers.logError(errMsg + "\n proxyApiErr = ", proxyApiErr);
    let statusCode = 400;
    let html = apiHelpers.generateResponseHtml(responseHtmlImages, null, null, {
      statusCode: statusCode,
      code: errMsg,
      message: proxyApiErr.response.data.message,
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
  let kpiProxyTknRsp = kpiResponse.data.results;

  let decodedLaunchToken = jwtHelpers.decode(launchToken);
  let rootCompanyId = decodedLaunchToken.claim.root_companies_id;

  /** */
  if (applicationDetails.root_companies_id != rootCompanyId) {
    let errMsg = "Error: Invalid application. root company is do not match.";
    loghelpers.logError(
      errMsg +
        "\n applicationDetails.root_companies_id = " +
        applicationDetails.root_companies_id +
        "\n rootCompanyId = " +
        rootCompanyId
    );
    let statusCode = 404;
    let html = apiHelpers.generateResponseHtml(responseHtmlImages, null, null, {
      statusCode: statusCode,
      code: "INVALID_APPLICATION",
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

  // Fetch application launch configuration
  let applicationLaunchConfig = null;
  let applicationLaunchConfigSql =
    "SELECT `launch_configuration_id`, `launch_configuration_name`, `root_companies_id`, `client_id`, `launch_uri`, `context_tokens`, `created_at`, `updated_at` FROM `ob_oauth_launch_configurations` WHERE `root_companies_id` = ? AND `client_id` = ?";
  let applicationLaunchConfigSqlData = [
    rootCompanyId,
    applicationDetails.client_id,
  ];

  loghelpers.dbLogger(
    configVars.NODE_ENV,
    applicationLaunchConfigSql,
    applicationLaunchConfigSqlData
  );

  try {
    [applicationLaunchConfig] = await promisePool.query(
      applicationLaunchConfigSql,
      applicationLaunchConfigSqlData
    );
  } catch (dbErr3) {
    let errMsg =
      "Error while fetching application launch configuration from database.";
    loghelpers.logError(errMsg + "\n dbErr3 = ", dbErr3);
    let statusCode = 400;
    let errorData = {
      statusCode: statusCode,
      message: errMsg,
      code: "DB_ERROR",
    };
    let html = apiHelpers.generateResponseHtml(
      responseHtmlImages,
      null,
      null,
      errorData
    );

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

  if (
    typeof applicationLaunchConfig === "undefined" ||
    applicationLaunchConfig === null ||
    applicationLaunchConfig === "" ||
    applicationLaunchConfig.length <= 0
  ) {
    let errMsg = "Appilcation launch configuration is invalid or not found.";
    loghelpers.logError(
      errMsg + "\n applicationLaunchConfig = ",
      applicationLaunchConfig
    );
    let statusCode = 404;
    let html = apiHelpers.generateResponseHtml(responseHtmlImages, null, null, {
      statusCode: statusCode,
      code: "INVALID_APPLICATION_CONFIG",
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

  // Create entry for KPI proxy data
  let createProxyRecord = null;
  let createProxyRecordSql =
    "INSERT INTO `ob_oauth_proxy`(`proxy_id`, `root_companies_id`, `client_id`, `launch_token`, `scope`, `context_tokens`, `token_used`, `created_at`, `updated_at`) VALUES (?,?,?,?,?,?,?,?,?)";
  let createProxyRecordData = [
    null,
    rootCompanyId,
    applicationDetails.client_id,
    launchToken,
    applicationDetails.scope,
    applicationLaunchConfig[0].context_tokens,
    "1",
    moment(new Date()).format("YYYY-MM-DD HH:mm:ss"),
    null,
  ];

  loghelpers.dbLogger(
    configVars.NODE_ENV,
    createProxyRecordSql,
    createProxyRecordData
  );

  try {
    [createProxyRecord] = await promisePool.query(
      createProxyRecordSql,
      createProxyRecordData
    );
  } catch (dbErr4) {
    let errMsg = "Error while creating kpi proxy record in database.";
    loghelpers.logError(errMsg + "\n dbErr4 = ", dbErr4);
    let statusCode = 400;
    let errorData = {
      statusCode: statusCode,
      message: errMsg,
      code: "DB_ERROR",
    };
    let html = apiHelpers.generateResponseHtml(
      responseHtmlImages,
      null,
      null,
      errorData
    );

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
  loghelpers.logMessage(
    "Entry created in ob_oauth_proxy: proxy_id = " + createProxyRecord.insertId
  );

  let kpiToken = kpiProxyTknRsp.token;
  let jwtId = commonHelpers.generateUniqueId();

  let code = kpiToken;

  // Create entry for oauth_authorization_codes
  let createAuthCodeRecord = null;
  let createAuthCodeRecordSql =
    "INSERT INTO `ob_oauth_authorization_codes`(`authorization_code_id`, `authorization_code`, `root_companies_id`, `client_id`, `user_id`, `redirect_uri`, `expires`, `scope`, `id_token`, `kpi_proxy_response`, `authorization_code_used`, `created_at`, `updated_at`) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)";
  let createAuthCodeRecordData = [
    null,
    code,
    applicationDetails.root_companies_id,
    clientId,
    kpiProxyTknRsp.username,
    redirectUri,
    moment(new Date()).add(2, "hours").format("YYYY-MM-DD HH:mm:ss"),
    scope,
    jwtId,
    JSON.stringify(kpiResponse.data.results),
    "0",
    moment(new Date()).format("YYYY-MM-DD HH:mm:ss"),
    null,
  ];

  loghelpers.dbLogger(
    configVars.NODE_ENV,
    createAuthCodeRecordSql,
    createAuthCodeRecordData
  );

  try {
    [createAuthCodeRecord] = await promisePool.query(
      createAuthCodeRecordSql,
      createAuthCodeRecordData
    );
  } catch (dbErr5) {
    let errMsg = "Error while creating kpi auth code record in database.";
    loghelpers.logError(errMsg + "\n dbErr5 = ", dbErr5);
    let statusCode = 400;
    let errorData = {
      statusCode: statusCode,
      message: errMsg,
      code: "DB_ERROR",
    };
    let html = apiHelpers.generateResponseHtml(
      responseHtmlImages,
      null,
      null,
      errorData
    );

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
  loghelpers.logMessage(
    "Entry created in ob_oauth_authorization_codes: authorization_code_id = " +
      createAuthCodeRecord.insertId
  );

  let redirectTo = redirectUri + "?code=" + code + "&state=" + state;

  return callback(
    null,
    apiHelpers.responseBuilder(
      {
        "x-request-id": commonHelpers.generateUniqueId(),
        Location: redirectTo,
      },
      null,
      307
    )
  );
};

/**
 * OAuth2.0 token endpoint
 */
const token = async (event, context, callback) => {
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
    loghelpers.logError(errMsg + "\n validationErr = ", validationErr);
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
    loghelpers.logError(errMsg + "\n envData = ", envData);
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

  let requestBody = null;
  try {
    requestBody = Object.fromEntries(new URLSearchParams(event.body));
  } catch (bodyParseErr) {
    let errMsg = "Error while parsing request body.";
    loghelpers.logError(errMsg + "\n bodyParseErr = ", bodyParseErr);
    let statusCode = 400;
    callback(
      null,
      apiHelpers.responseBuilder(
        null,
        JSON.stringify({
          message: errMsg,
          statusCode: statusCode,
        }),
        statusCode
      )
    );
    return;
  }

  let {
    grant_type: grantType,
    code,
    redirect_uri: redirectUri,
    client_id: clientIdFromBody,
  } = requestBody;

  let clientId = null;
  let clientSecret = null;
  let refreshTokenFlag = false;
  let { Authorization: authorization } = event.headers;
  if (
    typeof authorization != "undefined" &&
    authorization != null &&
    authorization != ""
  ) {
    let authorizationBase64Str = authorization.replace("Basic ", "");
    let authorizationStr = encryptionHelpers.base64Decode(
      authorizationBase64Str
    );
    let authorizationArr = authorizationStr.split(":");
    let clientIdFromHeader = authorizationArr[0];
    let clientSecretFromHeader = authorizationArr[1];

    clientId = clientIdFromHeader;
    clientSecret = clientSecretFromHeader;
  }

  if (
    typeof clientIdFromBody != "undefined" &&
    clientIdFromBody != null &&
    clientIdFromBody != ""
  ) {
    clientId = clientIdFromBody;
  }

  // Create a db connection pool
  const dbConPool = DB.createPool({
    host: configVars.DB_HOST,
    user: configVars.DB_USER,
    password: configVars.DB_PASS,
    database: configVars.DB_NAME,
    port: parseInt(configVars.DB_PORT, 10),
    waitForConnections: configVars.DB_WAIT_FOR_CON,
    connectionLimit: configVars.DB_MAX_CON,
    queueLimit: configVars.DB_QUERY_LIMIT,
    multipleStatements: configVars.DB_MULTIPLE_STMTS,
  });

  // now get a Promise wrapped instance of that pool
  const promisePool = dbConPool.promise();

  // Check if application exists
  let applicationExists = null;
  let applicationExistsSql =
    "SELECT `root_companies_id`, `application_name`, `hcs_id`, `client_id`, `client_secret`, `grant_types`, `scope`, `created_at`, `updated_at`, `status` FROM `ob_oauth_applications` WHERE `client_id` = ?";

  let applicationExistsData = [clientId];

  if (clientSecret != null) {
    applicationExistsSql += " AND `client_secret` = ?";
    applicationExistsData.push(clientSecret);
    refreshTokenFlag = true;
  }

  loghelpers.dbLogger(
    configVars.NODE_ENV,
    applicationExistsSql,
    applicationExistsData
  );

  try {
    [applicationExists] = await promisePool.query(
      applicationExistsSql,
      applicationExistsData
    );
  } catch (dbErr1) {
    let errMsg = "Error while checking application in database.";
    loghelpers.logError(errMsg + "\n dbErr1 = ", dbErr1);
    let statusCode = 400;
    callback(
      null,
      apiHelpers.responseBuilder(
        null,
        JSON.stringify({
          message: errMsg,
          statusCode: statusCode,
        }),
        statusCode
      )
    );
    return;
  }

  if (
    typeof applicationExists === "undefined" ||
    applicationExists === null ||
    applicationExists === "" ||
    applicationExists.length <= 0
  ) {
    loghelpers.logError(
      oauthConfig.error_codes.INVALID_COMPANY_ID_SECRET.message +
        "\n applicationExists = ",
      applicationExists
    );
    callback(
      null,
      apiHelpers.responseBuilder(
        null,
        JSON.stringify({
          message: oauthConfig.error_codes.INVALID_COMPANY_ID_SECRET.message,
          statusCode:
            oauthConfig.error_codes.INVALID_COMPANY_ID_SECRET.statusCode,
        }),
        oauthConfig.error_codes.INVALID_COMPANY_ID_SECRET.statusCode
      )
    );
    return;
  }

  let applicationDetails = applicationExists[0];

  if (
    applicationDetails.client_secret != null &&
    applicationDetails.client_secret != "" &&
    clientSecret == null
  ) {
    loghelpers.logError(
      oauthConfig.error_codes.INVALID_COMPANY_SECRET.message +
        "\n applicationDetails.client_secret = " +
        applicationDetails.client_secret +
        "\n clientSecret = " +
        clientSecret
    );
    callback(
      null,
      apiHelpers.responseBuilder(
        null,
        JSON.stringify({
          message: oauthConfig.error_codes.INVALID_COMPANY_SECRET.message,
          statusCode: oauthConfig.error_codes.INVALID_COMPANY_SECRET.statusCode,
        }),
        oauthConfig.error_codes.INVALID_COMPANY_SECRET.statusCode
      )
    );
    return;
  }

  let appId = applicationDetails.root_companies_id;
  let appGrantTypes = applicationDetails.grant_types.split(" ");
  if (!appGrantTypes.includes(grantType)) {
    loghelpers.logError(
      oauthConfig.error_codes.INVALID_GRANT_TYPE.message +
        "\n applicationDetails.grant_types = " +
        applicationDetails.grant_types +
        "\n grantType = " +
        grantType
    );
    callback(
      null,
      apiHelpers.responseBuilder(
        null,
        JSON.stringify({
          message: oauthConfig.error_codes.INVALID_GRANT_TYPE.message,
          statusCode: oauthConfig.error_codes.INVALID_GRANT_TYPE.statusCode,
        }),
        oauthConfig.error_codes.INVALID_GRANT_TYPE.statusCode
      )
    );
    return;
  }

  // Check if auth code exists
  let authCodeExists = null;
  let authCodeExistsSql =
    "SELECT `authorization_code_id`, `authorization_code`, `root_companies_id`, `client_id`, `user_id`, `redirect_uri`, `expires`, `scope`, `id_token`, `kpi_proxy_response`, `authorization_code_used`, `created_at`, `updated_at` FROM `ob_oauth_authorization_codes` WHERE `root_companies_id` = ? AND `client_id` = ? AND `authorization_code` = ?";
  let authCodeExistsData = [appId, clientId, code];

  loghelpers.dbLogger(
    configVars.NODE_ENV,
    authCodeExistsSql,
    authCodeExistsData
  );

  try {
    [authCodeExists] = await promisePool.query(
      authCodeExistsSql,
      authCodeExistsData
    );
  } catch (dbErr1) {
    let errMsg = "Error while checking authorization code in database.";
    loghelpers.logError(errMsg + "\n dbErr1 = ", dbErr1);
    let statusCode = 400;
    callback(
      null,
      apiHelpers.responseBuilder(
        null,
        JSON.stringify({
          message: errMsg,
          statusCode: statusCode,
        }),
        statusCode
      )
    );
    return;
  }

  if (
    typeof authCodeExists == "undefined" ||
    authCodeExists == null ||
    authCodeExists == "" ||
    authCodeExists.length <= 0
  ) {
    loghelpers.logError(
      oauthConfig.error_codes.INVALID_AUTHORIZATION_CODE.message +
        "\n authCodeExists = ",
      authCodeExists
    );
    callback(
      null,
      apiHelpers.responseBuilder(
        null,
        JSON.stringify({
          message: oauthConfig.error_codes.INVALID_AUTHORIZATION_CODE.message,
          statusCode:
            oauthConfig.error_codes.INVALID_AUTHORIZATION_CODE.statusCode,
        }),
        oauthConfig.error_codes.INVALID_AUTHORIZATION_CODE.statusCode
      )
    );
    return;
  }

  let authCodeDetails = authCodeExists[0];
  if (authCodeDetails.authorization_code_used != "0") {
    loghelpers.logError(
      oauthConfig.error_codes.AUTHORIZATION_CODE_EXPIRED.message +
        "\n authCodeDetails.authorization_code_used = " +
        authCodeDetails.authorization_code_used
    );
    callback(
      null,
      apiHelpers.responseBuilder(
        null,
        JSON.stringify({
          message: oauthConfig.error_codes.AUTHORIZATION_CODE_EXPIRED.message,
          statusCode:
            oauthConfig.error_codes.AUTHORIZATION_CODE_EXPIRED.statusCode,
        }),
        oauthConfig.error_codes.AUTHORIZATION_CODE_EXPIRED.statusCode
      )
    );
    return;
  }

  // Update auth code data
  let authCodeUpdate = null;
  let authCodeUpdateSql =
    "UPDATE `ob_oauth_authorization_codes` SET `authorization_code_used` = ?, `updated_at` = ? WHERE `authorization_code_id` = ?";
  let authCodeUpdateData = [
    "1",
    moment(new Date()).format("YYYY-MM-DD HH:mm:ss"),
    authCodeDetails.authorization_code_id,
  ];

  loghelpers.dbLogger(
    configVars.NODE_ENV,
    authCodeUpdateSql,
    authCodeUpdateData
  );

  try {
    [authCodeUpdate] = await promisePool.query(
      authCodeUpdateSql,
      authCodeUpdateData
    );
  } catch (dbErr1) {
    let errMsg = "Error while updating authorization code data in database.";
    loghelpers.logError(errMsg + "\n dbErr1 = ", dbErr1);
    let statusCode = 400;
    callback(
      null,
      apiHelpers.responseBuilder(
        null,
        JSON.stringify({
          message: errMsg,
          statusCode: statusCode,
        }),
        statusCode
      )
    );
    return;
  }

  if (authCodeUpdate.affectedRows != 1) {
    let errMsg =
      "Something went wrong while updating authorization code data in database.";
    loghelpers.logError(errMsg + "\n authCodeUpdate = ", authCodeUpdate);
    let statusCode = 400;
    callback(
      null,
      apiHelpers.responseBuilder(
        null,
        JSON.stringify({
          message: errMsg,
          statusCode: statusCode,
        }),
        statusCode
      )
    );
    return;
  }

  loghelpers.logMessage(
    "Authorization code status updated in ob_oauth_authorization_codes: authorization_code_id = " +
      authCodeDetails.authorization_code_id
  );

  // redirect uri is valid for client id using ob_oauth_redirect_uris
  let redirectUriExists = null;
  let redirectUriExistsSql =
    "SELECT `redirect_uri_id`, `root_companies_id`, `client_id`, `redirect_uri`, `created_at`, `updated_at` FROM `ob_oauth_redirect_uris` WHERE `client_id` = ? AND `redirect_uri` = ?";
  let redirectUriExistsData = [clientId, redirectUri];

  loghelpers.dbLogger(
    configVars.NODE_ENV,
    redirectUriExistsSql,
    redirectUriExistsData
  );

  try {
    [redirectUriExists] = await promisePool.query(
      redirectUriExistsSql,
      redirectUriExistsData
    );
  } catch (dbErr1) {
    let errMsg = "Error while checking application redirect uri in database.";
    loghelpers.logError(errMsg + "\n dbErr1 = ", dbErr1);
    let statusCode = 400;
    callback(
      null,
      apiHelpers.responseBuilder(
        null,
        JSON.stringify({
          message: errMsg,
          statusCode: statusCode,
        }),
        statusCode
      )
    );
    return;
  }

  if (
    typeof redirectUriExists == "undefined" ||
    redirectUriExists == null ||
    redirectUriExists == "" ||
    redirectUriExists.length <= 0
  ) {
    loghelpers.logError(
      oauthConfig.error_codes.INVALID_REDIRECT_URI.message +
        "\n redirectUriExists = ",
      redirectUriExists
    );
    callback(
      null,
      apiHelpers.responseBuilder(
        null,
        JSON.stringify({
          message: oauthConfig.error_codes.INVALID_REDIRECT_URI.message,
          statusCode: oauthConfig.error_codes.INVALID_REDIRECT_URI.statusCode,
        }),
        oauthConfig.error_codes.INVALID_REDIRECT_URI.statusCode
      )
    );
    return;
  }

  let scope = applicationDetails.scope;
  let needPatientBanner = true;
  let smartStyleUrl = configVars.SMART_STYLE_URL;
  let userId = authCodeDetails.user_id;
  let accessTokenExpiresIn = 3600;
  let tokenType = "bearer";
  let idToken = commonHelpers.generateUniqueId();
  let hcsId = applicationDetails.hcs_id;

  let opts = {
    secret: configVars.JWT_SECRET_KEY,
    jwtOptions: {
      expiresIn: configVars.JWT_REFRESH_EXPIRES_IN,
    },
  };

  let refreshTokenParams = {};
  let refreshToken = null;
  if (refreshTokenFlag) {
    refreshTokenParams.client_id = applicationDetails.client_id;
    refreshTokenParams.hcs_id = applicationDetails.hcsId;
    refreshTokenParams.scope = scope;

    let contextParams = {};
    contextParams.need_patient_banner = needPatientBanner;
    contextParams.smart_style_url = smartStyleUrl;
    refreshTokenParams.context = contextParams;

    refreshToken = await oauthHelpers.generateRefreshToken(
      configVars,
      refreshTokenParams,
      opts
    );
  }

  let accessTokenParams = {};

  accessTokenParams.need_patient_banner = needPatientBanner;
  accessTokenParams.smart_style_url = smartStyleUrl;
  if (refreshTokenFlag) {
    accessTokenParams.refresh_token = refreshToken;
  }
  accessTokenParams.token_type = tokenType;
  accessTokenParams.scope = scope;
  accessTokenParams.client_id = applicationDetails.client_id;
  accessTokenParams.expires_in = accessTokenExpiresIn;
  accessTokenParams.id_token = idToken;
  accessTokenParams.hcs_id = hcsId;

  opts.jwtOptions.expiresIn = configVars.JWT_EXPIRES_IN;
  let accessToken = await oauthHelpers.generateAccessToken(
    configVars,
    accessTokenParams,
    opts
  );

  // create entry in ob_oauth_access_tokens table
  let createAccessTokenRecord = null;
  let createAccessTokenRecordSql =
    "INSERT INTO `ob_oauth_access_tokens`(`access_token_id`, `access_token`, `refresh_token`, `root_companies_id`, `client_id`, `authorization_code_id`, `access_token_expires`, `refresh_token_expires`, `scope`, `created_at`, `updated_at`) VALUES (?,?,?,?,?,?,?,?,?,?,?)";
  let createAccessTokenRecordData = [
    null,
    accessToken,
    refreshToken,
    appId,
    clientId,
    authCodeDetails.authorization_code_id,
    moment(new Date())
      .add(accessTokenExpiresIn, "seconds")
      .format("YYYY-MM-DD HH:mm:ss"),
    refreshToken != null
      ? moment(new Date())
          .add(
            parseInt(configVars.JWT_REFRESH_EXPIRES_IN.replace("d", ""), 10),
            "days"
          )
          .format("YYYY-MM-DD HH:mm:ss")
      : null,
    scope,
    moment(new Date()).format("YYYY-MM-DD HH:mm:ss"),
    null,
  ];

  loghelpers.dbLogger(
    configVars.NODE_ENV,
    createAccessTokenRecordSql,
    createAccessTokenRecordData
  );

  try {
    [createAccessTokenRecord] = await promisePool.query(
      createAccessTokenRecordSql,
      createAccessTokenRecordData
    );
  } catch (dbErr5) {
    loghelpers.logError(
      oauthConfig.error_codes.ACCESSTOKEN_INSERT_FAILED.message,
      dbErr5
    );
    callback(
      null,
      apiHelpers.responseBuilder(
        null,
        JSON.stringify({
          data: {
            error: {
              statusCode:
                oauthConfig.error_codes.ACCESSTOKEN_INSERT_FAILED.statusCode,

              code: "ACCESSTOKEN_INSERT_FAILED",
              message:
                oauthConfig.error_codes.ACCESSTOKEN_INSERT_FAILED.message,
            },
          },
        }),
        oauthConfig.error_codes.ACCESSTOKEN_INSERT_FAILED.statusCode
      )
    );
    return;
  }
  loghelpers.logMessage(
    "Entry created in ob_oauth_access_tokens: access_token_id = " +
      createAccessTokenRecord.insertId
  );

  // check if kpi proxy response details exist
  let kpiProxyResponse = JSON.parse(authCodeDetails.kpi_proxy_response);

  let authData = {
    access_token: accessToken,
    token_type: tokenType,
    expires_in: accessTokenExpiresIn,
    hcs_id: hcsId,
    scope: scope,
    FACILITY_ID:
      typeof kpiProxyResponse.facilityId != "undefined"
        ? kpiProxyResponse.facilityId
        : null,
    PATIENT_DOB: moment(kpiProxyResponse.ptDOB, "DD-MM-YYYY").format(
      "YYYY-MM-DD"
    ),
    PATIENT_FIRST: kpiProxyResponse.ptFirstName,
    PATIENT_LAST: kpiProxyResponse.ptLastName,
    PATIENT_ZIP:
      typeof kpiProxyResponse.ptZip != "undefined"
        ? kpiProxyResponse.ptZip
        : null,
    USERID: userId,
    need_patient_banner: needPatientBanner,
    patient: kpiProxyResponse.ptMRN,
    smart_style_url: smartStyleUrl,
  };

  if (refreshToken != null) {
    authData.refresh_token = refreshToken;
  }

  loghelpers.logMessage("access token generated.", authData);

  return callback(
    null,
    apiHelpers.responseBuilder(null, JSON.stringify(authData))
  );
};

/**
 * Token verify endpoint
 */
const verify = async (event, context, callback) => {
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

  if (isEmpty(event.body)) {
    let errMsg = "access_token is required";
    loghelpers.logError(errMsg + `\nevent.body: `, event.body);
    callback(
      null,
      apiHelpers.responseBuilder(
        null,
        JSON.stringify({
          valid: false,
          error: {
            name: "INVALID_ACCESS_TOKEN",
            message: errMsg,
          },
        }),
        400
      )
    );
    return;
  }

  let { access_token: accessToken } = JSON.parse(event.body);
  let verifyToken = jwtHelpers.verify(accessToken, configVars.JWT_SECRET_KEY);
  if (verifyToken.status != true) {
    let errMsg = verifyToken.error.message;
    loghelpers.logError(errMsg + `\nverifyToken: `, verifyToken);
    callback(
      null,
      apiHelpers.responseBuilder(
        null,
        JSON.stringify({
          valid: verifyToken.status,
          error: {
            name: verifyToken.error.name,
            message: errMsg,
          },
        }),
        400
      )
    );
    return;
  }

  let statusCode = 200;
  callback(
    null,
    apiHelpers.responseBuilder(
      null,
      JSON.stringify({
        valid: verifyToken.status,
        statusCode: statusCode,
        message: "access token is valid",
      }),
      statusCode
    )
  );
};

module.exports = {
  authorize: authorize,
  token: token,
  verify: verify,
};
