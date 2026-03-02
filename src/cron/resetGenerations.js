const { supabase } = require("../db/client");
const { notifyShopAdmins } = require("../services/notifications");

async function runResetGenerationsJob(bot) {
  const { data, error } = await supabase
    .from("shops")
    .update({ generations_used: 0 })
    .eq("status", "active")
    .select("id,name");

  if (error) {
    throw new Error(`resetGenerations: ${error.message}`);
  }

  await Promise.all(
    (data || []).map(async (shop) => {
      const message = `Лимит генераций для магазина «${shop.name}» обновлён ✅`;
      await notifyShopAdmins(bot, shop.id, message);
    })
  );

  return {
    reset: data?.length || 0
  };
}

module.exports = {
  runResetGenerationsJob
};
