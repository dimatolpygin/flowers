const { config, validateEnv } = require("./config");
const { createBot } = require("./bot");
const { connectRedis, redis } = require("./cache/client");

async function main() {
  validateEnv();
  await connectRedis();

  const bot = createBot();
  await bot.launch();

  console.log(`Bot started in ${config.nodeEnv} mode`);

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
