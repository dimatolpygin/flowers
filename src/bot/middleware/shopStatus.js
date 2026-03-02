const { shops } = require("../../db");

const STATUS_MESSAGES = {
  suspended: "Подписка истекла. Свяжитесь с администратором.",
  deleted: "Нет доступа."
};

async function checkShopStatus(ctx, next) {
  const user = ctx.state.user;
  if (!user || user.role === "super_admin" || !user.shop_id) {
    return next();
  }

  const shop = await shops.getShopById(user.shop_id);
  if (!shop) {
    await ctx.reply("Магазин не найден.");
    return;
  }

  ctx.state.shop = shop;

  if (shop.status !== "active") {
    const message = STATUS_MESSAGES[shop.status] || "Магазин недоступен.";
    await ctx.reply(message);
    return;
  }

  return next();
}

module.exports = {
  checkShopStatus
};
