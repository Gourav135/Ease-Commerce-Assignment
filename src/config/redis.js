process.env.NODE_ENV = process.env.NODE_ENV || "qa";

const configPackage = require("config");
const secretsConfig = require("../../secret/qa.json");

const redisConfig = {
  host: configPackage.get("redis.host"),
  port: configPackage.get("redis.port"),
  db: configPackage.get("redis.db"),
  password: secretsConfig.redis.password || undefined,
};

module.exports = {
  redisConfig,
};
