const { inviteTokens, users } = require("../../../db");
const { ensureBotUsername } = require("../../utils/ensureBotUsername");
const plans = require("../../../config/plans");

const INVITE_TTL_DAYS = 7;

function extractName(text) {
  return text.replace(/\/add_operator\s*/i, "").trim();
}

async function handleAddOperator(ctx) {
  const shop = ctx.state.shop;
  if (!shop) {
    await ctx.reply("Магазин не найден.");
    return;
  }

  const name = extractName(ctx.message?.text || "");
  if (!name) {
    await ctx.reply("Укажи имя оператора: /add_operator Иван");
    return;
  }

  const existingOperators = await users.listOperatorsByShop(shop.id);
  const limit =
    shop.operators_limit || plans[shop.plan]?.operatorsLimit || plans.start.operatorsLimit;

  if (existingOperators.length >= limit) {
    await ctx.reply("Достигнут лимит операторов по тарифу.");
    return;
  }

  const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);
  const invite = await inviteTokens.createInviteToken({
    shopId: shop.id,
    role: "operator",
    createdBy: ctx.state.user?.telegram_id || ctx.from.id,
    displayName: name,
    expiresAt: expiresAt.toISOString()
  });

  const botUsername = await ensureBotUsername(ctx);
  const inviteLink = `https://t.me/${botUsername}?start=invite_${invite.token}`;

  await ctx.reply(`Ссылка для ${name}: ${inviteLink}`);
}

module.exports = {
  handleAddOperator
};
