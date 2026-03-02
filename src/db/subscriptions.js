const { supabase } = require("./client");
const { assertNoError } = require("./_shared");

async function createSubscription(payload) {
  const { data, error } = await supabase
    .from("subscriptions")
    .insert({
      shop_id: payload.shopId,
      plan: payload.plan,
      price: payload.price,
      generations_limit: payload.generationsLimit,
      resolution: payload.resolution,
      regen_limit: payload.regenLimit,
      started_at: payload.startedAt,
      expires_at: payload.expiresAt,
      status: payload.status || "active",
      payment_ref: payload.paymentRef || null,
      created_by: payload.createdBy,
      note: payload.note || null
    })
    .select("*")
    .single();

  assertNoError(error, "create subscription failed");
  return data;
}

async function listSubscriptionsByShop(shopId) {
  const { data, error } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("shop_id", shopId)
    .order("created_at", { ascending: false });

  assertNoError(error, "list subscriptions by shop failed");
  return data || [];
}

async function getActiveSubscriptionByShop(shopId) {
  const { data, error } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("shop_id", shopId)
    .eq("status", "active")
    .order("expires_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  assertNoError(error, "get active subscription by shop failed");
  return data;
}

module.exports = {
  createSubscription,
  listSubscriptionsByShop,
  getActiveSubscriptionByShop
};
