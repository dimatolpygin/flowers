const { supabase } = require("../../../db/client");

const DURATION_MAP = {
  день: { label: "день", days: 1 },
  неделя: { label: "неделю", days: 7 },
  месяц: { label: "месяц", days: 30 }
};

async function handleGlobalStats(ctx) {
  const text = ctx.message?.text || "";
  const part = text.trim().split(/\s+/).filter(Boolean)[1] || "неделя";
  const duration = DURATION_MAP[part] || DURATION_MAP["неделя"];

  const since = new Date(Date.now() - duration.days * 24 * 60 * 60 * 1000).toISOString();

  const { data: shopsData = [] } = await supabase
    .from("shops")
    .select("id,status,name");

  const statusCounts = {
    active: 0,
    suspended: 0,
    deleted: 0,
    total: shopsData.length
  };
  shopsData.forEach((shop) => {
    if (shop.status === "active") statusCounts.active += 1;
    if (shop.status === "suspended") statusCounts.suspended += 1;
    if (shop.status === "deleted") statusCounts.deleted += 1;
  });

  const { data: generationLog = [] } = await supabase
    .from("generation_log")
    .select("shop_id,is_regen,api_credits_spent")
    .gte("created_at", since);

  const generationsTotal = generationLog.length;
  const regenTotal = generationLog.filter((row) => row.is_regen).length;
  const creditsTotal = generationLog.reduce((sum, row) => sum + Number(row.api_credits_spent || 0), 0);

  const { data: subs = [] } = await supabase
    .from("subscriptions")
    .select("shop_id,price")
    .gte("started_at", since);

  const revenue = subs.reduce((sum, sub) => sum + Number(sub.price || 0), 0);

  const topMap = generationLog.reduce((acc, row) => {
    acc[row.shop_id] = (acc[row.shop_id] || 0) + 1;
    return acc;
  }, {});

  const topShops = Object.entries(topMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([shopId, count]) => {
      const shop = shopsData.find((item) => item.id === shopId);
      return `${shop?.name || shopId}: ${count}`;
    });

  const message = [
    `Статистика за ${duration.label}:`,
    `Магазинов: активных ${statusCounts.active}, приостановленных ${statusCounts.suspended}, всего ${statusCounts.total}`,
    `Генераций: ${generationsTotal}`,
    `Перегенераций: ${regenTotal}`,
    `Кредиты: ${creditsTotal.toFixed(2)}`,
    `Выручка: ${revenue.toFixed(2)} ₽`,
    topShops.length ? `Топ магазинов: ${topShops.join("; ")}` : "Топ магазинов: —"
  ];

  await ctx.reply(message.join("\n"));
}

module.exports = {
  handleGlobalStats
};
