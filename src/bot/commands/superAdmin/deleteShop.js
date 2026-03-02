const { shops } = require("../../../db");

async function handleDeleteShop(ctx) {
  const text = ctx.message?.text || "";
  const parts = text.trim().split(/\s+/).filter(Boolean);
  if (parts.length < 3 || parts[2] !== "confirm") {
    await ctx.reply("Потвердите удаление: /delete_shop <shop_id> confirm");
    return;
  }

  const shopId = parts[1];
  await shops.updateShopStatus(shopId, "deleted");
  await ctx.reply(`Магазин ${shopId} удалён.`);
}

module.exports = {
  handleDeleteShop
};
