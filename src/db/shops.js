const { supabase } = require("./client");
const { assertNoError } = require("./_shared");

async function createShop(name) {
  const { data, error } = await supabase
    .from("shops")
    .insert({ name })
    .select("*")
    .single();

  assertNoError(error, "create shop failed");
  return data;
}

async function getShopById(shopId) {
  const { data, error } = await supabase
    .from("shops")
    .select("*")
    .eq("id", shopId)
    .maybeSingle();

  assertNoError(error, "get shop by id failed");
  return data;
}

async function listShops() {
  const { data, error } = await supabase
    .from("shops")
    .select("*")
    .order("created_at", { ascending: false });

  assertNoError(error, "list shops failed");
  return data || [];
}

async function updateShopStatus(shopId, status) {
  const { data, error } = await supabase
    .from("shops")
    .update({ status })
    .eq("id", shopId)
    .select("*")
    .single();

  assertNoError(error, "update shop status failed");
  return data;
}

async function updateShopPlan(shopId, payload) {
  const update = {
    plan: payload.plan,
    generations_limit: payload.generationsLimit,
    regen_limit_per_order: payload.regenLimitPerOrder,
    resolution: payload.resolution,
    subscription_expires_at: payload.subscriptionExpiresAt,
    operators_limit: payload.operatorsLimit
  };

  const { data, error } = await supabase
    .from("shops")
    .update(update)
    .eq("id", shopId)
    .select("*")
    .single();

  assertNoError(error, "update shop plan failed");
  return data;
}

async function updateShopLimits(shopId, payload) {
  const update = {
    plan: payload.plan || "custom",
    generations_limit: payload.generationsLimit,
    regen_limit_per_order: payload.regenLimitPerOrder,
    resolution: payload.resolution,
    operators_limit: payload.operatorsLimit
  };

  const { data, error } = await supabase
    .from("shops")
    .update(update)
    .eq("id", shopId)
    .select("*")
    .single();

  assertNoError(error, "update shop limits failed");
  return data;
}

async function resetShopGenerationUsage(shopId) {
  const { data, error } = await supabase
    .from("shops")
    .update({ generations_used: 0 })
    .eq("id", shopId)
    .select("*")
    .single();

  assertNoError(error, "reset shop generation usage failed");
  return data;
}

async function updateShopLogoTemplateUrl(shopId, url) {
  const { data, error } = await supabase
    .from("shops")
    .update({ logo_template_url: url })
    .eq("id", shopId)
    .select("*")
    .single();

  assertNoError(error, "update shop logo template url failed");
  return data;
}

module.exports = {
  createShop,
  getShopById,
  listShops,
  updateShopStatus,
  updateShopPlan,
  resetShopGenerationUsage,
  updateShopLogoTemplateUrl,
  updateShopLimits
};
