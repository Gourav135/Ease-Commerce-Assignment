const { Queue } = require("bullmq");
const configPackage = require("config");

const { redisConfig } = require("./redis");

const BULK_ORDER_QUEUE = configPackage.get("queues.bulkOrders.name");
const BULK_ORDER_CONCURRENCY = configPackage.get("queues.bulkOrders.concurrency");

const queueConnection = {
  host: redisConfig.host,
  port: redisConfig.port,
  password: redisConfig.password,
  db: redisConfig.db,
};

const bulkOrderQueue = new Queue(BULK_ORDER_QUEUE, {
  connection: queueConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 1000,
    },
    removeOnComplete: 100,
    removeOnFail: 1000,
  },
});

module.exports = {
  BULK_ORDER_QUEUE,
  BULK_ORDER_CONCURRENCY,
  queueConnection,
  bulkOrderQueue,
};
