const { redis } = require("../cache/client");
const { config } = require("../config");

async function withCronLock(name, fn) {
  const key = `cron:lock:${name}`;
  const acquired = await redis.set(key, "1", "NX", "EX", config.cronLockTtlSeconds);
  if (!acquired) {
    console.log(`[cron] ${name} skipped (lock exists)`);
    return;
  }

  try {
    await fn();
  } catch (error) {
    throw error;
  } finally {
    await redis.del(key);
  }
}

module.exports = {
  withCronLock
};
