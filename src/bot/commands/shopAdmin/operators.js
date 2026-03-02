const { users, orders } = require("../../../db");

async function handleOperators(ctx) {
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

  const counts = await orders.countOrdersByOperator(shop.id);

  const lines = operatorRows.map((operator) => {
    const ident = operator.username
      ? `@${operator.username}`
      : operator.display_name || operator.telegram_id;
    const total = counts[operator.id] || 0;
    return `${ident} | ${operator.display_name || "нет имени"} | заказов: ${total}`;
  });

  await ctx.reply(lines.join("\n"));
}

module.exports = {
  handleOperators
};
