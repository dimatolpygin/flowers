const path = require("node:path");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

function required(name) {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

function parseIdList(raw) {
  return raw
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean)
    .map((v) => Number(v))
    .filter(Number.isFinite);
}

function validateEnv() {
  required("BOT_TOKEN");
  required("SUPABASE_URL");
  required("SUPABASE_SERVICE_ROLE_KEY");
  required("REDIS_URL");
  required("KIE_API_KEY");
  required("SUPER_ADMIN_IDS");
}

const config = {
  nodeEnv: process.env.NODE_ENV || "development",
  botToken: process.env.BOT_TOKEN || "",
  supabaseUrl: process.env.SUPABASE_URL || "",
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  redisUrl: process.env.REDIS_URL || "",
  kieApiKey: process.env.KIE_API_KEY || "",
  kieApiBaseUrl: process.env.KIE_API_BASE_URL || "https://api.kie.ai",
  kieModel: process.env.KIE_MODEL || "nano-banana-2",
  superAdminIds: parseIdList(process.env.SUPER_ADMIN_IDS || "")
};

module.exports = {
  config,
  validateEnv
};
