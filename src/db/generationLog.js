const { supabase } = require("./client");
const { assertNoError } = require("./_shared");

async function createGenerationLog(payload) {
  const { data, error } = await supabase
    .from("generation_log")
    .insert({
      shop_id: payload.shopId,
      order_id: payload.orderId,
      operator_id: payload.operatorId,
      resolution_used: payload.resolutionUsed,
      is_regen: Boolean(payload.isRegen),
      api_credits_spent: payload.apiCreditsSpent || 0
    })
    .select("*")
    .single();

  assertNoError(error, "create generation log failed");
  return data;
}

async function listGenerationLogByShop(shopId, limit = 100) {
  const { data, error } = await supabase
    .from("generation_log")
    .select("*")
    .eq("shop_id", shopId)
    .order("created_at", { ascending: false })
    .limit(limit);

  assertNoError(error, "list generation log by shop failed");
  return data || [];
}

async function listGenerationLogSince(shopId, sinceIso) {
  const { data, error } = await supabase
    .from("generation_log")
    .select("*")
    .eq("shop_id", shopId)
    .gte("created_at", sinceIso)
    .order("created_at", { ascending: false });

  assertNoError(error, "list generation log since failed");
  return data || [];
}

module.exports = {
  createGenerationLog,
  listGenerationLogByShop,
  listGenerationLogSince
};
