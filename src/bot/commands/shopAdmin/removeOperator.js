const { users } = require("../../../db");

async function handleRemoveOperator(ctx) {
  const shop = ctx.state.shop;
  if (!shop) {
    await ctx.reply("Магазин не найден.");
    return;
  }

  const operatorRows = await users.listOperatorsByShop(shop.id);
  if (!operatorRows.length) {
    await ctx.reply("Операторов пока нет.");
    return;
  }

  const keyboard = operatorRows.map((operator) => {
    const name = operator.display_name || operator.username || operator.telegram_id;
    return [
      {
        text: `Удалить ${name}`,
        callback_data: `confirm_remove_${operator.id}`
      }
    ];
  });

  keyboard.push([
    { text: "Отмена", callback_data: "cancel_remove" }
  ]);

  await ctx.reply("Выберите оператора для удаления:", {
    reply_markup: { inline_keyboard: keyboard }
  });
}

module.exports = {
  handleRemoveOperator
};
