const { users } = require("../../../db");

function registerConfirmRemoveOperator(bot) {
  bot.action(/^confirm_remove_(.+)$/, async (ctx) => {
    const shop = ctx.state.shop;
    if (!shop) {
      await ctx.answerCbQuery("Магазин не найден.");
      return;
    }

    const userId = ctx.match[1];
    const operator = await users.getUserById(userId);
    if (!operator || operator.shop_id !== shop.id || operator.role !== "operator") {
      await ctx.answerCbQuery("Оператор не найден.");
      return;
    }

    await users.deleteUserById(userId);
    await ctx.editMessageText("Оператор удалён.");
    await ctx.answerCbQuery("Готово");
  });

  bot.action("cancel_remove", async (ctx) => {
    await ctx.answerCbQuery("Отменено");
    await ctx.deleteMessage().catch(() => {});
  });
}

module.exports = {
  registerConfirmRemoveOperator
};
