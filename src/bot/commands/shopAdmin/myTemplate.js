async function handleMyTemplate(ctx) {
  const shop = ctx.state.shop;
  if (!shop) {
    await ctx.reply("Магазин не найден.");
    return;
  }

  if (!shop.logo_template_url) {
    await ctx.reply("Логотип ещё не загружен. Отправьте PNG, чтобы добавить.");
    return;
  }

  await ctx.replyWithPhoto(shop.logo_template_url, {
    caption: "Это текущий логотип. Нажмите «Заменить», чтобы загрузить новый.",
    reply_markup: {
      inline_keyboard: [
        [{ text: "Заменить", callback_data: "start_replace_template" }]
      ]
    }
  });
}

module.exports = {
  handleMyTemplate
};
