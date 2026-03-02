const { shops, subscriptions } = require("../../../db");
const plans = require("../../../config/plans");

async function handleSetPlan(ctx) {
  const text = ctx.message?.text || "";
  const parts = text.trim().split(/\s+/).filter(Boolean);
  if (parts.length < 3) {
    await ctx.reply("Используй: /set_plan <shop_id> <start|basic|pro>");
    return;
  }

  const shopId = parts[1];
  const planKey = parts[2].toLowerCase();
  const plan = plans[planKey];

  if (!plan) {
    await ctx.reply("План не найден. Доступные: start, basic, pro.");
    return;
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + plan.durationDays * 24 * 60 * 60 * 1000);

  await shops.updateShopPlan(shopId, {
    plan: plan.name,
    generationsLimit: plan.generationsLimit,
    regenLimitPerOrder: plan.regenLimitPerOrder,
    resolution: plan.resolution,
    subscriptionExpiresAt: expiresAt.toISOString()
  });

  await subscriptions.createSubscription({
    shopId,
    plan: plan.name,
    price: plan.price,
    generationsLimit: plan.generationsLimit,
    resolution: plan.resolution,
    regenLimit: plan.regenLimitPerOrder,
    startedAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    createdBy: ctx.from.id
  });

  await ctx.reply(`Тариф для магазина ${shopId} установлен на ${plan.name}.`);
}

module.exports = {
  handleSetPlan
};
