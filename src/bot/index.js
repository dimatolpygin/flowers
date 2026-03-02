const { Telegraf, session } = require("telegraf");
const { config } = require("../config");
const { buildSessionStore } = require("../cache/session");
const { handleStart } = require("./commands/common/start");

function createBot() {
  const bot = new Telegraf(config.botToken);

  bot.use(session({ store: buildSessionStore() }));

  bot.start(handleStart);

  bot.command("new", async (ctx) => {
    await ctx.reply("/new flow is not wired yet. Next step: FSM implementation.");
  });

  bot.catch((err, ctx) => {
    console.error("Bot error", { err, updateId: ctx.update?.update_id });
  });

  return bot;
}

module.exports = {
  createBot
};
