const { subscriptions } = require("../../../db");

function formatDate(value) {
  if (!value) {
    return "—";
  }
  return new Date(value).toLocaleDateString("ru-RU", { timeZone: "Europe/Moscow" });
}

async function handleMyPlan(ctx) {
  const shop = ctx.state.shop;
  if (!shop) {
    await ctx.reply("Магазин не найден.");
    return;
  }

  const plan = await subscriptions.getActiveSubscriptionByShop(shop.id);
  const lines = [
    `Тариф: ${plan?.plan || shop.plan}`,
    `Лимит генераций: ${shop.generations_used}/${shop.generations_limit}`,
    `Перегенераций за заказ: ${shop.regen_limit_per_order}`,
    `Разрешение: ${shop.resolution}`,
    `Подписка до: ${formatDate(plan?.expires_at || shop.subscription_expires_at)}`
  ];

  await ctx.reply(lines.join("\n"));
}

module.exports = {
  handleMyPlan
};
