const { shops } = require("../../../db");

async function handleSetLimits(ctx) {
  const text = ctx.message?.text || "";
  const parts = text.trim().split(/\s+/).filter(Boolean);
  if (parts.length < 5) {
    await ctx.reply("Используй: /set_limits <shop_id> <generations> <regen_per_order> <resolution>");
    return;
  }

  const shopId = parts[1];
  const generationsLimit = Number(parts[2]);
  const regenPerOrder = Number(parts[3]);
  const resolution = parts[4].toUpperCase();

  if (!Number.isFinite(generationsLimit) || !Number.isFinite(regenPerOrder)) {
    await ctx.reply("Лимиты должны быть числами.");
    return;
  }

  await shops.updateShopLimits(shopId, {
    generationsLimit,
    regenLimitPerOrder: regenPerOrder,
    resolution
  });

  await ctx.reply(`Лимиты для магазина ${shopId} обновлены.`);
}

module.exports = {
  handleSetLimits
};
