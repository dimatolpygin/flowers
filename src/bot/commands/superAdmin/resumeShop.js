const { shops } = require("../../../db");

async function handleResumeShop(ctx) {
  const text = ctx.message?.text || "";
  const parts = text.trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) {
    await ctx.reply("Укажи ID магазина: /resume_shop <shop_id>");
    return;
  }

  const shopId = parts[1];
  await shops.updateShopStatus(shopId, "active");
  await ctx.reply(`Магазин ${shopId} снова активен.`);
}

module.exports = {
  handleResumeShop
};
