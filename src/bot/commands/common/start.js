const { inviteTokens, shops, users } = require("../../../db");
const { config } = require("../../../config");

const INVITE_PREFIX = "invite_";

function formatUserName(from) {
  if (!from) {
    return "пользователь";
  }

  if (from.username) {
    return `@${from.username}`;
  }

  const parts = [from.first_name, from.last_name].filter(Boolean);
  return parts.join(" ") || "пользователь";
}

function isInvitePayload(text) {
  return Boolean(text && text.startsWith(INVITE_PREFIX));
}

async function handleStart(ctx) {
  if (isInvitePayload(ctx.startPayload)) {
    return handleInvite(ctx, ctx.startPayload.slice(INVITE_PREFIX.length));
  }

  if (ctx.state.user) {
    const role = ctx.state.user.role;
    const name = ctx.state.user.display_name || ctx.state.user.username || "коллега";
    await ctx.reply(`Привет, ${name}!`);
    await ctx.reply(roleMessage(role));
    return;
  }

  await ctx.reply("Бот запущен. Если есть инвайт, откройте его через /start invite_<token>.");
}

async function handleInvite(ctx, token) {
  const telegramId = ctx.from?.id;
  if (!telegramId) {
    return ctx.reply("Не удалось определить ваш Telegram ID.");
  }

  const invite = await inviteTokens.getInviteToken(token);
  if (!invite || !invite.shop_id) {
    return ctx.reply("Ссылка недействительна. Запросите новую.");
  }

  if (invite.used_at) {
    return ctx.reply("Ссылка уже использована.");
  }

  if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
    return ctx.reply("Ссылка истекла. Запросите новую.");
  }

  const existingUser = await users.getUserByTelegramId(telegramId);
  if (existingUser) {
    return ctx.reply("Вы уже зарегистрированы в системе.");
  }

  const displayName = formatUserName(ctx.from);
  const newUser = await users.createUser({
    telegramId,
    username: ctx.from?.username || null,
    role: invite.role,
    shopId: invite.shop_id,
    displayName
  });

  await inviteTokens.markInviteTokenUsed(token);
  const shop = await shops.getShopById(invite.shop_id);
  if (!shop) {
    return ctx.reply("Магазин не найден. Обратитесь к администратору.");
  }

  if (invite.role === "shop_admin") {
    await shops.updateShopStatus(shop.id, "active");
    ctx.session = ctx.session || {};
    ctx.session.onboarding = {
      type: "logo",
      shopId: shop.id,
      userId: newUser.id
    };

    await ctx.reply(
      "Магазин активирован! Шаг 1: загрузите логотип магазина (PNG, минимум 500×500, прозрачный фон)."
    );
    await ctx.reply("После загрузки логотипа вы увидите меню доступных команд.");
    await notifySuperAdmins(ctx, shop, displayName);
    return;
  }

  if (invite.role === "operator") {
    await ctx.reply("Добро пожаловать! Используйте /new для создания открытки.");
    await notifyShopAdmins(ctx, shop.id, displayName, ctx.from?.username);
    return;
  }

  await ctx.reply("Роль токена не поддерживается.");
}

async function notifySuperAdmins(ctx, shop, actorName) {
  const message = `Магазин «${shop.name}» активирован (${actorName}).`;
  await Promise.all(
    config.superAdminIds.map(async (id) => {
      try {
        await ctx.telegram.sendMessage(id, message);
      } catch (err) {
        console.warn(`notification to super admin ${id} failed`, err);
      }
    })
  );
}

async function notifyShopAdmins(ctx, shopId, actorName, username) {
  const message = `Флорист ${actorName} ${username ? `( @${username} )` : ""} подключился.`;
  const admins = await users.listShopAdmins(shopId);
  await Promise.all(
    admins.map(async (admin) => {
      try {
        await ctx.telegram.sendMessage(admin.telegram_id, message);
      } catch (err) {
        console.warn(`failed to notify shop admin ${admin.telegram_id}`, err);
      }
    })
  );
}

function roleMessage(role) {
  if (role === "super_admin") {
    return "Доступные команды для супер-админа:\n" +
      "/create_shop, /shops, /shop_info, /set_plan, /set_limits, /suspend_shop,\n" +
      "/resume_shop, /delete_shop, /reset_stats, /global_stats";
  }
  if (role === "shop_admin") {
    return "Доступные команды для шоп-админа:\n" +
      "/add_operator, /operators, /remove_operator, /my_stats, /my_template, /my_plan";
  }
  if (role === "operator") {
    return "Используйте /new для создания открытки.";
  }
  return "Команда не определена, обратитесь к администратору.";
}

module.exports = {
  handleStart
};
