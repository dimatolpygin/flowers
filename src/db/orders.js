const { supabase } = require("./client");
const { assertNoError } = require("./_shared");

async function createOrder(payload) {
  const { data, error } = await supabase
    .from("orders")
    .insert({
      shop_id: payload.shopId,
      operator_id: payload.operatorId,
      photos_input: payload.photosInput || [],
      style: payload.style,
      description: payload.description,
      greeting_text: payload.greetingText,
      variants: payload.variants || [],
      chosen_variant: payload.chosenVariant || null,
      regen_count: payload.regenCount || 0
    })
    .select("*")
    .single();

  assertNoError(error, "create order failed");
  return data;
}

async function getOrderById(orderId) {
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .maybeSingle();

  assertNoError(error, "get order by id failed");
  return data;
}

async function listOrdersByShop(shopId, limit = 30) {
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("shop_id", shopId)
    .order("created_at", { ascending: false })
    .limit(limit);

  assertNoError(error, "list orders by shop failed");
  return data || [];
}

async function countOrdersByOperator(shopId) {
  const { data = [], error } = await supabase
    .from("orders")
    .select("operator_id")
    .eq("shop_id", shopId);

  assertNoError(error, "count orders by operator failed");

  return data.reduce((acc, order) => {
    if (!order.operator_id) return acc;
    acc[order.operator_id] = (acc[order.operator_id] || 0) + 1;
    return acc;
  }, {});
}

module.exports = {
  createOrder,
  getOrderById,
  listOrdersByShop,
  countOrdersByOperator
};
