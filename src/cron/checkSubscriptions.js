const { supabase } = require("../db/client");
const { notifyShopAdmins, notifySuperAdmins } = require("../services/notifications");

async function runCheckSubscriptionsJob(bot) {
  const now = new Date();
  const warningDate = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

  const { data: warningShops, error: warningError } = await supabase
    .from("shops")
    .select("id,name,subscription_expires_at")
    .eq("status", "active")
    .gte("subscription_expires_at", now.toISOString())
    .lte("subscription_expires_at", warningDate.toISOString());

  if (warningError) {
    throw new Error(`checkSubscriptions warning: ${warningError.message}`);
  }

  await Promise.all(
    (warningShops || []).map(async (shop) => {
      const message = `Подписка магазина «${shop.name}» истекает ${new Date(shop.subscription_expires_at).toLocaleDateString("ru-RU")}.`;
      await notifyShopAdmins(bot, shop.id, message);
    })
  );

  const { data: expiredShops, error: expiredError } = await supabase
    .from("shops")
    .select("id,name")
    .eq("status", "active")
    .lte("subscription_expires_at", now.toISOString());

  if (expiredError) {
    throw new Error(`checkSubscriptions expired: ${expiredError.message}`);
  }

  await Promise.all(
    (expiredShops || []).map(async (shop) => {
      await supabase.from("shops").update({ status: "suspended" }).eq("id", shop.id);
      const message = `Подписка магазина «${shop.name}» истекла. Магазин приостановлен.`;
      await notifyShopAdmins(bot, shop.id, message);
      await notifySuperAdmins(bot, message);
    })
  );

  return {
    warned: warningShops?.length || 0,
    suspended: expiredShops?.length || 0
  };
}

module.exports = {
  runCheckSubscriptionsJob
};
