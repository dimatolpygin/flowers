const { supabase } = require("../db/client");

async function runCleanTokensJob() {
  const now = new Date().toISOString();
  const { error, data } = await supabase
    .from("invite_tokens")
    .delete()
    .lt("expires_at", now)
    .is("used_at", null);

  if (error) {
    throw new Error(`cleanTokens: ${error.message}`);
  }

  return {
    deleted: Array.isArray(data) ? data.length : 0
  };
}

module.exports = {
  runCleanTokensJob
};
