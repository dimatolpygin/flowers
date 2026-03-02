const { Telegraf, session } = require("telegraf");
const { config } = require("../config");
const { buildSessionStore } = require("../cache/session");
const { handleStart } = require("./commands/common/start");
const { ensureAuth } = require("./middleware/auth");
const { enforceRoles } = require("./middleware/role");
const { checkShopStatus } = require("./middleware/shopStatus");
const { handleLogoUpload } = require("./onboarding/logoUpload");

function createBot() {
  const bot = new Telegraf(config.botToken);

  bot.use(session({ store: buildSessionStore() }));
  bot.use(ensureAuth);
  bot.use(enforceRoles);
  bot.use(checkShopStatus);

  bot.start(handleStart);

  bot.command("new", async (ctx) => {
    await ctx.reply("/new flow is not wired yet. Next step: FSM implementation.");
  });

  bot.on(["photo", "document"], handleLogoUpload);

  bot.catch((err, ctx) => {
    console.error("Bot error", { err, updateId: ctx.update?.update_id });
  });

  return bot;
}

module.exports = {
  createBot
};
