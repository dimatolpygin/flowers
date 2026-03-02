const { Telegraf, session } = require("telegraf");
const { config } = require("../config");
const { buildSessionStore } = require("../cache/session");
const { handleStart } = require("./commands/common/start");
const { handleAddOperator } = require("./commands/shopAdmin/addOperator");
const { handleOperators } = require("./commands/shopAdmin/operators");
const { handleRemoveOperator } = require("./commands/shopAdmin/removeOperator");
const { handleMyStats } = require("./commands/shopAdmin/myStats");
const { handleMyTemplate } = require("./commands/shopAdmin/myTemplate");
const { handleMyPlan } = require("./commands/shopAdmin/myPlan");
const { ensureAuth } = require("./middleware/auth");
const { enforceRoles } = require("./middleware/role");
const { checkShopStatus } = require("./middleware/shopStatus");
const { handleLogoUpload } = require("./onboarding/logoUpload");
const { registerConfirmRemoveOperator } = require("./callbacks/shopAdmin/confirmRemoveOperator");
const { registerReplaceTemplate } = require("./callbacks/shopAdmin/replaceTemplate");
const { handleCreateShop } = require("./commands/superAdmin/createShop");
const { handleShops } = require("./commands/superAdmin/shops");
const { handleShopInfo } = require("./commands/superAdmin/shopInfo");
const { handleSetPlan } = require("./commands/superAdmin/setPlan");
const { handleSetLimits } = require("./commands/superAdmin/setLimits");
const { handleSuspendShop } = require("./commands/superAdmin/suspendShop");
const { handleResumeShop } = require("./commands/superAdmin/resumeShop");
const { handleDeleteShop } = require("./commands/superAdmin/deleteShop");
const { handleResetStats } = require("./commands/superAdmin/resetStats");
const { handleGlobalStats } = require("./commands/superAdmin/globalStats");

function createBot() {
  const bot = new Telegraf(config.botToken);

  bot.use(session({ store: buildSessionStore() }));
  bot.use(ensureAuth);
  bot.use(enforceRoles);
  bot.use(checkShopStatus);

  bot.start(handleStart);
  bot.command("create_shop", handleCreateShop);
  bot.command("shops", handleShops);
  bot.command("shop_info", handleShopInfo);
  bot.command("set_plan", handleSetPlan);
  bot.command("set_limits", handleSetLimits);
  bot.command("suspend_shop", handleSuspendShop);
  bot.command("resume_shop", handleResumeShop);
  bot.command("delete_shop", handleDeleteShop);
  bot.command("reset_stats", handleResetStats);
  bot.command("global_stats", handleGlobalStats);
  bot.command("add_operator", handleAddOperator);
  bot.command("operators", handleOperators);
  bot.command("remove_operator", handleRemoveOperator);
  bot.command("my_stats", handleMyStats);
  bot.command("my_template", handleMyTemplate);
  bot.command("my_plan", handleMyPlan);

  bot.command("new", async (ctx) => {
    await ctx.reply("/new flow is not wired yet. Next step: FSM implementation.");
  });

  bot.on(["photo", "document"], handleLogoUpload);
  registerConfirmRemoveOperator(bot);
  registerReplaceTemplate(bot);

  bot.catch((err, ctx) => {
    console.error("Bot error", { err, updateId: ctx.update?.update_id });
  });

  return bot;
}

module.exports = {
  createBot
};
