process.env.NODE_ENV = process.env.NODE_ENV || "qa";

const configPackage = require("config");
const secretsConfig = require("../../secret/qa.json");

const courierPartnerConfig = {
  urbanebolt: {
    courierId: configPackage.get("urbanebolt.courierId"),
    baseUrl: configPackage.get("urbanebolt.baseUrl"),
    customerCode: configPackage.get("urbanebolt.customerCode"),
    tokenEndpoint: configPackage.get("urbanebolt.tokenEndpoint"),
    manifestEndpoint: configPackage.get("urbanebolt.manifestEndpoint"),
    trackingEndpoint: configPackage.get("urbanebolt.trackingEndpoint"),
    cancelEndpoint: configPackage.get("urbanebolt.cancelEndpoint"),
    retries: {
      maxAttempts: configPackage.get("urbanebolt.retries.maxAttempts"),
      retryDelayMs: configPackage.get("urbanebolt.retries.retryDelayMs"),
    },
    username: secretsConfig.urbanebolt.username,
    password: secretsConfig.urbanebolt.password,
  },
};

const test = {
  courierId: configPackage.get("test.courierId"),
  baseUrl: configPackage.get("test.baseUrl"),
  customerCode: configPackage.get("test.customerCode"),
  tokenEndpoint: configPackage.get("test.tokenEndpoint"),
  manifestEndpoint: configPackage.get("test.manifestEndpoint"),
  trackingEndpoint: configPackage.get("test.trackingEndpoint"),
  cancelEndpoint: configPackage.get("test.cancelEndpoint"),
  retries: {
    maxAttempts: configPackage.get("test.retries.maxAttempts"),
    retryDelayMs: configPackage.get("test.retries.retryDelayMs"),
  },
  username: secretsConfig.test.username,
  password: secretsConfig.test.password,
};

module.exports = {
  courierPartnerConfig,
  test,
};
