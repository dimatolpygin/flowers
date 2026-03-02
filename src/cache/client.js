const Redis = require("ioredis");
const { config } = require("../config");

const redis = new Redis(config.redisUrl, {
  lazyConnect: true,
  maxRetriesPerRequest: 2
});

async function connectRedis() {
  if (redis.status === "ready") {
    return;
  }
  await redis.connect();
}

module.exports = {
  redis,
  connectRedis
};
