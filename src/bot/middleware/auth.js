const { users } = require("../../db");

function isInviteStart(ctx) {
  return Boolean(ctx.startPayload && ctx.startPayload.startsWith("invite_"));
}

function isStartCommand(ctx) {
  return Boolean(
    ctx.updateType === "message" &&
    ctx.message?.text?.toLowerCase().startsWith("/start")
  );
}

async function ensureAuth(ctx, next) {
  const telegramId = ctx.from?.id;
  if (!telegramId) {
    return next();
  }

  const storedUser = await users.getUserByTelegramId(telegramId);
  if (!storedUser) {
    if (isStartCommand(ctx) || isInviteStart(ctx)) {
      return next();
    }

    await ctx.reply("Нет доступа. Обратитесь к администратору.");
    return;
  }

  ctx.state.user = storedUser;
  return next();
}

module.exports = {
  ensureAuth
};
