const { config, validateEnv } = require("./config");
const { createBot } = require("./bot");
const { connectRedis, redis } = require("./cache/client");
const { startCronJobs } = require("./cron");

const RETRY_BASE_DELAY_MS = 2000;
const RETRY_MAX_ATTEMPTS = 5;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function launchWithRetry(bot) {
  for (let attempt = 1; attempt <= RETRY_MAX_ATTEMPTS; attempt += 1) {
    try {
      await bot.launch();
      return;
    } catch (error) {
      const isNetworkError = error?.code && ["ETIMEDOUT", "ECONNRESET", "ENOTFOUND"].includes(error.code);
      console.error(`launch attempt ${attempt} failed`, { code: error.code || error.message });
      if (attempt === RETRY_MAX_ATTEMPTS || !isNetworkError) {
        throw error;
      }
      await sleep(RETRY_BASE_DELAY_MS * attempt);
    }
  }
}

async function main() {
  validateEnv();
  await connectRedis();

  const bot = createBot();
  await launchWithRetry(bot);

  console.log(`Bot started in ${config.nodeEnv} mode`);
  startCronJobs(bot);

  const shutdown = async (signal) => {
    console.log(`${signal} received, shutting down`);
    await bot.stop(signal);
    await redis.quit();
    process.exit(0);
  };

  process.once("SIGINT", () => {
    void shutdown("SIGINT");
  });
  process.once("SIGTERM", () => {
    void shutdown("SIGTERM");
  });
}

main().catch((error) => {
  console.error("Startup failed", error);
  process.exit(1);
});
