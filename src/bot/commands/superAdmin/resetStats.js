const { shops } = require("../../../db");

async function handleResetStats(ctx) {
  const text = ctx.message?.text || "";
  const parts = text.trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) {
    await ctx.reply("Укажи ID магазина: /reset_stats <shop_id>");
    return;
  }

  const shopId = parts[1];
  await shops.resetShopGenerationUsage(shopId);
  await ctx.reply(`Статистика генераций для ${shopId} сброшена.`);
}

module.exports = {
  handleResetStats
};
