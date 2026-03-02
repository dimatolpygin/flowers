async function handleStart(ctx) {
  await ctx.reply(
    "Bot is running. If you have an invite link, open it with the start token."
  );
}

module.exports = {
  handleStart
};
