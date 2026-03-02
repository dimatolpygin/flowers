const { supabase } = require("./client");
const { assertNoError } = require("./_shared");

async function getUserByTelegramId(telegramId) {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("telegram_id", telegramId)
    .maybeSingle();

  assertNoError(error, "get user by telegram id failed");
  return data;
}

async function createUser(payload) {
  const { data, error } = await supabase
    .from("users")
    .insert({
      telegram_id: payload.telegramId,
      username: payload.username || null,
      role: payload.role,
      shop_id: payload.shopId || null,
      display_name: payload.displayName || null
    })
    .select("*")
    .single();

  assertNoError(error, "create user failed");
  return data;
}

async function listOperatorsByShop(shopId) {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("shop_id", shopId)
    .eq("role", "operator")
    .order("created_at", { ascending: false });

  assertNoError(error, "list operators by shop failed");
  return data || [];
}

async function deleteUserById(userId) {
  const { error } = await supabase.from("users").delete().eq("id", userId);
  assertNoError(error, "delete user failed");
}

module.exports = {
  getUserByTelegramId,
  createUser,
  listOperatorsByShop,
  deleteUserById
};
