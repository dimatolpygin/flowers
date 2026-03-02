const { shops, inviteTokens } = require("../../../db");
const { config } = require("../../../config");

const INVITE_TTL_DAYS = 7;

async function ensureBotUsername(ctx) {
  if (config.botUsername) {
    return config.botUsername;
  }

  const me = await ctx.telegram.getMe();
  config.botUsername = me.username;
  return config.botUsername;
}

async function handleCreateShop(ctx) {
  const text = ctx.message?.text || "";
  const name = text.replace(/\/create_shop\s*/i, "").trim();
  if (!name) {
    await ctx.reply("Укажи название магазина: /create_shop Бирюзовые цветы");
    return;
  }

  const shop = await shops.createShop(name);
  const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);
  const invite = await inviteTokens.createInviteToken({
    shopId: shop.id,
    role: "shop_admin",
    createdBy: ctx.from.id,
    expiresAt: expiresAt.toISOString()
  });

  const botUsername = await ensureBotUsername(ctx);
  const inviteLink = `https://t.me/${botUsername}?start=invite_${invite.token}`;

  await ctx.reply(
    `Магазин «${shop.name}» создан (ID: ${shop.id}). Ссылка для shop_admin: ${inviteLink}`
  );
}

module.exports = {
  handleCreateShop
};
