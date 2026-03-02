const COMMAND_ROLE_ALLOWLIST = {
  start: ["super_admin", "shop_admin", "operator"],
  new: ["operator"],
  create_shop: ["super_admin"],
  shops: ["super_admin"],
  shop_info: ["super_admin"],
  set_plan: ["super_admin"],
  set_limits: ["super_admin"],
  suspend_shop: ["super_admin"],
  resume_shop: ["super_admin"],
  delete_shop: ["super_admin"],
  reset_stats: ["super_admin"],
  global_stats: ["super_admin"],
  add_operator: ["shop_admin"],
  operators: ["shop_admin"],
  remove_operator: ["shop_admin"],
  my_stats: ["shop_admin"],
  my_template: ["shop_admin"],
  my_plan: ["shop_admin"],
  help: ["super_admin", "shop_admin", "operator"]
};

function extractCommandName(ctx) {
  const text = ctx.message?.text;
  if (!text) {
    return null;
  }

  const entity = ctx.message.entities?.find((item) => item.type === "bot_command");
  const raw = entity
    ? text.slice(entity.offset, entity.offset + entity.length)
    : text.split(" ")[0];

  if (!raw.startsWith("/")) {
    return null;
  }

  const sanitized = raw.replace(/^\//, "").split("@")[0].toLowerCase();
  return sanitized;
}

async function enforceRoles(ctx, next) {
  const command = extractCommandName(ctx);
  if (!command) {
    return next();
  }

  const allowlist = COMMAND_ROLE_ALLOWLIST[command];
  if (!allowlist || allowlist.length === 0) {
    return next();
  }

  const userRole = ctx.state.user?.role;
  if (!userRole) {
    return next();
  }

  if (!allowlist.includes(userRole)) {
    await ctx.reply("Нет прав для этой команды.");
    return;
  }

  return next();
}

module.exports = {
  enforceRoles
};
