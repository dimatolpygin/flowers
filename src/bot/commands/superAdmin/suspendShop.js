const { shops } = require("../../../db");

async function handleSuspendShop(ctx) {
  const text = ctx.message?.text || "";
  const parts = text.trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) {
    await ctx.reply("Укажи ID магазина: /suspend_shop <shop_id>");
    return;
  }

  const shopId = parts[1];
  await shops.updateShopStatus(shopId, "suspended");
  await ctx.reply(`Магазин ${shopId} приостановлен.`);
}

module.exports = {
  handleSuspendShop
};
