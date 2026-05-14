process.env.NODE_ENV = process.env.NODE_ENV || "qa";

const configPackage = require("config");
const { redisConfig } = require("./redis");
const { prisma } = require("./prisma");
const {
  BULK_ORDER_QUEUE,
  BULK_ORDER_CONCURRENCY,
  queueConnection,
  bulkOrderQueue,
} = require("./queue");
const { courierPartnerConfig, test } = require("./courierPartner");

const appConfig = {
  nodeEnv: configPackage.get("nodeEnv"),
  port: configPackage.get("port"),
};

const config = {
  nodeEnv: appConfig.nodeEnv,
  port: appConfig.port,
  redis: redisConfig,
  urbanebolt: courierPartnerConfig.urbanebolt,
  test,
};

module.exports = {
  appConfig,
  redisConfig,
  prisma,
  courierPartnerConfig,
  BULK_ORDER_QUEUE,
  BULK_ORDER_CONCURRENCY,
  bulkOrderQueue,
  queueConnection,
  config,
};
