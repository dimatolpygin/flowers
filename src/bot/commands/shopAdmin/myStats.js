const { generationLog, orders, subscriptions } = require("../../../db");

const PERIODS = {
  день: 1,
  неделя: 7,
  месяц: 30
};

function formatDate(value) {
  if (!value) {
    return "—";
  }
  return new Date(value).toLocaleDateString("ru-RU", { timeZone: "Europe/Moscow" });
}

async function handleMyStats(ctx) {
  const shop = ctx.state.shop;
  if (!shop) {
    await ctx.reply("Магазин не найден.");
    return;
  }

  const parts = (ctx.message?.text || "").trim().split(/\s+/);
  const periodKey = parts[1]?.toLowerCase() || "неделя";
  const days = PERIODS[periodKey] || PERIODS["неделя"];
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const logs = await generationLog.listGenerationLogSince(shop.id, since);
  const regenCount = logs.filter((entry) => entry.is_regen).length;
  const operatorCounts = await orders.countOrdersByOperator(shop.id);

  const operatorRows = Object.entries(operatorCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([operatorId, total]) => `${operatorId}: ${total} заказов`);

  const activeSub = await subscriptions.getActiveSubscriptionByShop(shop.id);

  const message = [
    `Генераций: ${shop.generations_used}/${shop.generations_limit}`,
    `Перегенераций за ${days} дн.: ${regenCount}`,
    `Подписка до: ${formatDate(activeSub?.expires_at || shop.subscription_expires_at)}`,
    `Топ-операторы:\n${operatorRows.length ? operatorRows.join("\n") : "—"}`
  ];

  await ctx.reply(message.join("\n"));
}

module.exports = {
  handleMyStats
};
