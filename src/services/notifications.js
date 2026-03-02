const { config } = require("../config");
const { users } = require("../db");

async function notifySuperAdmins(bot, text) {
  if (!bot || !config.superAdminIds.length) {
    return;
  }

  await Promise.all(
    config.superAdminIds.map(async (id) => {
      try {
        await bot.telegram.sendMessage(id, text);
      } catch (error) {
        console.warn(`#${id} super admin notify failed`, error.message);
      }
    })
  );
}

async function notifyShopAdmins(bot, shopId, text) {
  if (!bot || !shopId) {
    return;
  }

  const admins = await users.listShopAdmins(shopId);
  if (!admins.length) {
    return;
  }

  await Promise.all(
    admins.map(async (admin) => {
      try {
        await bot.telegram.sendMessage(admin.telegram_id, text);
      } catch (error) {
        console.warn(`#${admin.telegram_id} shop admin notify failed`, error.message);
      }
    })
  );
}

module.exports = {
  notifySuperAdmins,
  notifyShopAdmins
};
