const { supabase } = require("./client");
const { assertNoError } = require("./_shared");

async function createInviteToken(payload) {
  const { data, error } = await supabase
    .from("invite_tokens")
    .insert({
      shop_id: payload.shopId,
      role: payload.role,
      created_by: payload.createdBy,
      display_name: payload.displayName || null,
      expires_at: payload.expiresAt
    })
    .select("*")
    .single();

  assertNoError(error, "create invite token failed");
  return data;
}

async function getInviteToken(token) {
  const { data, error } = await supabase
    .from("invite_tokens")
    .select("*")
    .eq("token", token)
    .maybeSingle();

  assertNoError(error, "get invite token failed");
  return data;
}

async function markInviteTokenUsed(token) {
  const { data, error } = await supabase
    .from("invite_tokens")
    .update({ used_at: new Date().toISOString() })
    .eq("token", token)
    .is("used_at", null)
    .select("*")
    .maybeSingle();

  assertNoError(error, "mark invite token used failed");
  return data;
}

module.exports = {
  createInviteToken,
  getInviteToken,
  markInviteTokenUsed
};
