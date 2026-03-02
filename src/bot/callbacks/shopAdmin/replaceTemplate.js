function registerReplaceTemplate(bot) {
  bot.action("start_replace_template", async (ctx) => {
    const shop = ctx.state.shop;
    if (!shop) {
      await ctx.answerCbQuery("Магазин не найден.");
      return;
    }

    ctx.session = ctx.session || {};
    ctx.session.onboarding = {
      type: "logo",
      shopId: shop.id,
      userId: ctx.state.user?.id
    };

    await ctx.answerCbQuery();
    await ctx.reply(
      "Загрузите новый PNG-логотип (прозрачный фон, минимум 500×500)."
    );
  });
}

module.exports = {
  registerReplaceTemplate
};
