const { shops, users, subscriptions } = require("../../../db");

function formatDate(value) {
  if (!value) {
    return "—";
  }
  return new Date(value).toLocaleString("ru-RU", { timeZone: "Europe/Moscow" });
}

async function handleShopInfo(ctx) {
  const text = ctx.message?.text || "";
  const parts = text.trim().split(" ").filter(Boolean);
  if (parts.length < 2) {
    await ctx.reply("Укажи ID магазина: /shop_info <shop_id>");
    return;
  }

  const shopId = parts[1];
  const shop = await shops.getShopById(shopId);
  if (!shop) {
    await ctx.reply("Магазин не найден.");
    return;
  }

  const operators = await users.listOperatorsByShop(shopId);
  const subs = await subscriptions.listSubscriptionsByShop(shopId);
  const lastSubscription = subs[0];

  const summary = [
    `Название: ${shop.name}`,
    `Статус: ${shop.status}`,
    `Тариф: ${shop.plan}`,
    `Лимит: ${shop.generations_used}/${shop.generations_limit}`,
    `Перегенераций за заказ: ${shop.regen_limit_per_order}`,
    `Resolution: ${shop.resolution}`,
    `Подписка активна до: ${formatDate(shop.subscription_expires_at)}`,
    `Операторов: ${operators.length}`,
    `Последняя подписка: ${lastSubscription ? `${lastSubscription.plan} (${formatDate(lastSubscription.expires_at)})` : "нет"}`
  ];

  const operatorList = operators
    .map((operator) => `  - ${operator.display_name || operator.username || operator.telegram_id}`)
    .join("\n");

  await ctx.reply(summary.join("\n") + (operatorList ? `\nОператоры:\n${operatorList}` : ""));
}

module.exports = {
  handleShopInfo
};
