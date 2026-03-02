const { shops } = require("../../../db");

function formatShopRow(shop) {
  return `• ${shop.name} | ${shop.plan} | ${shop.status} | ${shop.generations_used}/${shop.generations_limit}`;
}

async function handleShops(ctx) {
  const list = await shops.listShops();
  if (!list.length) {
    await ctx.reply("Магазинов пока нет.");
    return;
  }

  const rows = list.map(formatShopRow);
  await ctx.reply(rows.join("\n"));
}

module.exports = {
  handleShops
};
