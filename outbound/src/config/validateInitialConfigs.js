var Joi = require("joi");

/**
 * Validate initial environment setup using `process.env` values
 * @returns Response object
 */
const validateInitialConfigs = () => {
  let validationErr = {};
  validationErr.code = null;
  validationErr.message = null;

  const envVarsSchema = Joi.object()
    .keys({
      NODE_ENV: Joi.string().required().empty("").messages({
        "any.required": "NODE_ENV",
        "any.empty": "NODE_ENV",
      }),
      AWS_SECRET_NAME: Joi.string().required().empty("").messages({
        "any.required": "AWS_SECRET_NAME",
        "any.empty": "AWS_SECRET_NAME",
      }),
      AWS_SECRET_REGION: Joi.string().required().empty("").messages({
        "any.required": "AWS_SECRET_REGION",
        "any.empty": "AWS_SECRET_REGION",
      }),
      AWS_SECRET_FLAG: Joi.any().required().valid("0", "1").messages({
        "any.required": "AWS_SECRET_FLAG",
        "any.valid": "AWS_SECRET_FLAG",
      }),
      AWS_ACCESS_KEY_ID: Joi.any().when(Joi.ref("AWS_SECRET_FLAG"), {
        is: Joi.equal("1"),
        then: Joi.required().invalid("").messages({
          "any.required": "AWS_ACCESS_KEY_ID",
          "any.invalid": "AWS_ACCESS_KEY_ID",
        }),
        otherwise: Joi.optional(),
      }),
      AWS_SECRET_ACCESS_KEY: Joi.any().when(Joi.ref("AWS_SECRET_FLAG"), {
        is: Joi.equal("1"),
        then: Joi.required().invalid("").messages({
          "any.required": "AWS_SECRET_ACCESS_KEY",
          "any.invalid": "AWS_SECRET_ACCESS_KEY",
        }),
        otherwise: Joi.optional(),
      }),
      KPI_FAVICON: Joi.string().required().empty("").messages({
        "any.required": "KPI_FAVICON",
        "any.empty": "KPI_FAVICON",
      }),
      KPI_LOGO: Joi.string().required().empty("").messages({
        "any.required": "KPI_LOGO",
        "any.empty": "KPI_LOGO",
      }),
    })
    .unknown();

  const { error } = envVarsSchema.validate(
    {
      NODE_ENV: process.env.NODE_ENV,
      AWS_SECRET_NAME: process.env.AWS_SECRET_NAME,
      AWS_SECRET_REGION: process.env.AWS_SECRET_REGION,
      AWS_SECRET_FLAG: process.env.AWS_SECRET_FLAG,
      AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
      AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
      KPI_FAVICON: process.env.KPI_FAVICON,
      KPI_LOGO: process.env.KPI_LOGO,
    },
    { abortEarly: false }
  );

  if (error) {
    validationErr.code = "INVALID_ENV_CONFIGURATIONS";

    let repStr = '"AWS_SECRET_FLAG" must be one of [0, 1]';
    error.message = error.message.replace(repStr, "AWS_SECRET_FLAG");

    validationErr.message =
      error.message.replace(/\./g, ",") +
      " parameters are missing / invalid in initial environment setup.";
  }

  return validationErr;
};

module.exports = validateInitialConfigs;
