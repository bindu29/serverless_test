module.exports = {
  error_codes: {
    INVALID_CLIENT_ID: {
      statusCode: 400,
      message: "Client Id is invalid.",
    },
    INVALID_EHR_SYSTEM_ID: {
      statusCode: 400,
      message: "EHR System Id is invalid.",
    },
    INVALID_LAUNCH_TOKEN: {
      statusCode: 400,
      message: "Launch Token is either invalid or expired.",
    },
    LAUNCH_TOKEN_EXPIRED: {
      statusCode: 401,
      message: "Launch Token is expired.",
    },
    INVALID_REDIRECT_URI: {
      statusCode: 400,
      message: "Redirect Uri is invalid.",
    },
    INVALID_RESPONSE_TYPE: {
      statusCode: 400,
      message: "Response Type is invalid.",
    },
    INVALID_COMPANY_ID_SECRET: {
      statusCode: 400,
      message: "Client Id or Secret is invalid.",
    },
    INVALID_COMPANY_SECRET: {
      statusCode: 400,
      message: "Client Secret is invalid.",
    },
    INVALID_GRANT_TYPE: {
      statusCode: 401,
      message: "Grant Type is invalid.",
    },
    INVALID_AUTHORIZATION_CODE: {
      statusCode: 401,
      message: "Authorization Code is invalid.",
    },
    AUTHORIZATION_CODE_EXPIRED: {
      statusCode: 401,
      message: "Authorization Code is expired.",
    },
    KPI_PROXY_NOTFOUND: {
      statusCode: 400,
      message: "KPI Proxy Details Not Found.",
    },
    ACCESSTOKEN_INSERT_FAILED: {
      statusCode: 400,
      message: "Access Token Insertion Failed.",
    },
  },
};
