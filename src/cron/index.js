const cron = require("node-cron");
const { config } = require("../config");
const { withCronLock } = require("./locks");
const { runCleanTokensJob } = require("./cleanTokens");
const { runCheckSubscriptionsJob } = require("./checkSubscriptions");
const { runResetGenerationsJob } = require("./resetGenerations");

function startCronJobs(bot) {
  if (!config.cronEnabled) {
    console.log("[cron] disabled");
    return;
  }

  cron.schedule(
    config.cronDailySchedule,
    async () => {
      try {
        await withCronLock("cleanTokens", async () => {
          const stats = await runCleanTokensJob();
          console.log("[cron] cleanTokens", stats);
        });
        await withCronLock("checkSubscriptions", async () => {
          const stats = await runCheckSubscriptionsJob(bot);
          console.log("[cron] checkSubscriptions", stats);
        });
      } catch (error) {
        console.error("[cron] daily job failed", error);
      }
    },
    { scheduled: true }
  );

  cron.schedule(
    config.cronMonthlySchedule,
    async () => {
      try {
        await withCronLock("resetGenerations", async () => {
          const stats = await runResetGenerationsJob(bot);
          console.log("[cron] resetGenerations", stats);
        });
      } catch (error) {
        console.error("[cron] monthly job failed", error);
      }
    },
    { scheduled: true }
  );
}

module.exports = {
  startCronJobs
};
