const { redis } = require("./client");

const SESSION_TTL_SECONDS = 24 * 60 * 60;

function buildSessionStore(prefix = "session") {
  return {
    async get(key) {
      const raw = await redis.get(`${prefix}:${key}`);
      return raw ? JSON.parse(raw) : undefined;
    },
    async set(key, value) {
      await redis.set(
        `${prefix}:${key}`,
        JSON.stringify(value),
        "EX",
        SESSION_TTL_SECONDS
      );
    },
    async delete(key) {
      await redis.del(`${prefix}:${key}`);
    }
  };
}

module.exports = {
  buildSessionStore
};
