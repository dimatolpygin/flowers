const { config } = require("../../config");

async function ensureBotUsername(ctx) {
  if (config.botUsername) {
    return config.botUsername;
  }

  const me = await ctx.telegram.getMe();
  config.botUsername = me.username;
  return config.botUsername;
}

module.exports = {
  ensureBotUsername
};
