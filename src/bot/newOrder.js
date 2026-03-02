const { Markup } = require("telegraf");
const sharp = require("sharp");
const PDFDocument = require("pdfkit");
const { createTask, queryTask } = require("../services/generation/kieai");
const { buildCardPrompt } = require("../services/generation/prompts");
const { orders, generationLog, shops } = require("../db");

const STYLE_OPTIONS = [
  { label: "Реализм", id: "realism" },
  { label: "Аниме", id: "anime" },
  { label: "Акварель", id: "watercolor" },
  { label: "Иллюстрация", id: "illustration" },
  { label: "Мульт", id: "cartoon" },
  { label: "Комикс", id: "comic" }
];

function ensureSession(ctx) {
  if (!ctx.session) {
    ctx.session = {};
  }
  return ctx.session;
}

function initNewOrderSession() {
  return {
    step: 1,
    photos: [],
    style: null,
    description: null,
    greeting: null,
    generation: {
      variants: [],
      regenCount: 0,
      selectedVariant: null
    }
  };
}

function askForPhotos(ctx) {
  const session = ensureSession(ctx);
  session.newOrder.step = 1;
  ctx.reply(
    "Шаг 1 — загрузите до 2 фотографий (референсы). Отправьте фото, нажмите “Готово” или “Пропустить”.",
    Markup.inlineKeyboard([
      [
        Markup.button.callback("Пропустить", "skip_photos"),
        Markup.button.callback("Готово", "ready_photos")
      ]
    ])
  );
}

function askForStyle(ctx) {
  const session = ensureSession(ctx);
  session.newOrder.step = 2;
  const keyboard = STYLE_OPTIONS.map((option) => [Markup.button.callback(option.label, `style_${option.id}`)]);
  ctx.reply("Шаг 2 — выберите стиль", Markup.inlineKeyboard(keyboard));
}

function askForDescription(ctx) {
  const session = ensureSession(ctx);
  session.newOrder.step = 3;
  ctx.reply("Шаг 3 — опишите, что должно быть на открытке:");
}

function askForGreeting(ctx) {
  const session = ensureSession(ctx);
  session.newOrder.step = 4;
  ctx.reply("Шаг 4 — введите текст поздравления:");
}

function showSummary(ctx) {
  const session = ensureSession(ctx);
  const order = session.newOrder;
  order.step = 5;
  const lines = [
    `Фото: ${order.photos.length} шт.`,
    `Стиль: ${order.style || "не выбран"}`,
    `Описание: ${order.description || ""}`,
    `Поздравление: ${order.greeting || ""}`
  ];
  const buttons = [
    [Markup.button.callback("Редактировать фото", "edit_photos")],
    [Markup.button.callback("Редактировать стиль", "edit_style")],
    [Markup.button.callback("Редактировать описание", "edit_description")],
    [Markup.button.callback("Редактировать текст", "edit_greeting")],
    [Markup.button.callback("🚀 Сгенерировать", "confirm_generate")]
  ];
  ctx.reply(lines.join("\n"), Markup.inlineKeyboard(buttons));
}

function summaryReady(order) {
  return order.photos && order.photos.length >= 0 && order.style && order.description && order.greeting;
}

async function startNewOrder(ctx) {
  const shop = ctx.state.shop;
  if (!shop || shop.status !== "active") {
    await ctx.reply("Подписка магазина не активна.");
    return;
  }

  if (shop.generations_used >= shop.generations_limit) {
    await ctx.reply("Лимит генераций исчерпан.");
    return;
  }

  const session = ensureSession(ctx);
  session.newOrder = initNewOrderSession();
  askForPhotos(ctx);
}

async function handlePhoto(ctx) {
  const session = ensureSession(ctx);
  const order = session.newOrder;
  if (!order || order.step !== 1) {
    return;
  }

  const fileId = ctx.message.photo?.slice(-1)[0]?.file_id;
  if (!fileId) {
    return;
  }

  if (order.photos.length >= 2) {
    await ctx.reply("Максимум 2 фото. Нажмите “Пропустить” или “Готово”.");
    return;
  }

  order.photos.push(fileId);
  await ctx.reply(`Принято фото ${order.photos.length}/2`, Markup.inlineKeyboard([
    [
      Markup.button.callback("Готово", "ready_photos"),
      Markup.button.callback("Пропустить", "skip_photos")
    ]
  ]));
  if (order.photos.length === 2) {
    askForStyle(ctx);
  }
}

function handleSkipPhotos(ctx) {
  const session = ensureSession(ctx);
  const order = session.newOrder;
  if (!order) {
    return;
  }
  askForStyle(ctx);
}

function handleReadyPhotos(ctx) {
  const session = ensureSession(ctx);
  const order = session.newOrder;
  if (!order) {
    return ctx.answerCbQuery("Сессия не найдена");
  }
  if (!order.photos.length) {
    return ctx.answerCbQuery("Загрузите хотя бы одно фото или нажмите Пропустить");
  }
  askForStyle(ctx);
  ctx.answerCbQuery();
}

function handleStyle(ctx, styleId) {
  const session = ensureSession(ctx);
  const order = session.newOrder;
  if (!order) {
    return ctx.answerCbQuery("Сессия не найдена.");
  }
  order.style = styleId;
  ctx.answerCbQuery(`Стиль: ${styleId}`);
  askForDescription(ctx);
}

async function handleText(ctx) {
  const session = ensureSession(ctx);
  const order = session.newOrder;
  if (!order) {
    return;
  }

  if (order.step === 3) {
    order.description = ctx.message.text;
    askForGreeting(ctx);
    return;
  }

  if (order.step === 4) {
    order.greeting = ctx.message.text;
    showSummary(ctx);
    return;
  }
}

async function regenerateVariants(ctx) {
  await ctx.answerCbQuery("Генерируем заново...");
  await generateAndShowVariants(ctx, { resetRegen: false });
}

async function generateAndShowVariants(ctx, options = {}) {
  const session = ensureSession(ctx);
  const order = session.newOrder;
  if (!order) {
    return;
  }
  if (options.resetRegen !== false) {
    order.generation.regenCount = 0;
  }
  await ctx.reply("⏳ Запускаю генерацию двух вариантов...");
  const prompt = buildCardPrompt({
    style: order.style,
    description: order.description,
    greetingText: order.greeting
  });

  const imageInput = await buildImageInput(ctx, order);
  const results = await Promise.all([
    createTask({ prompt: `${prompt} Variant 1`, imageInput }),
    createTask({ prompt: `${prompt} Variant 2`, imageInput })
  ]);

  const variants = [];
  for (const result of results) {
    const taskId = result?.data?.taskId || result?.data?.task_id;
    if (!taskId) {
      throw new Error("не удалось считать taskId");
    }
    const record = await waitForKieResult(taskId);
    const urls = extractImageUrls(record);
    if (!urls.length) {
      throw new Error("нет URL изображения");
    }
    variants.push({
      url: urls[0],
      credits: record?.data?.credits_spent || 0
    });
  }

  order.generation.variants = variants;
  order.step = 7;
  await presentVariants(ctx, variants);
}

async function presentVariants(ctx, variants) {
  await ctx.reply("Готово! Выбери вариант:");
  for (let i = 0; i < variants.length; i++) {
    await ctx.replyWithPhoto(variants[i].url, { caption: `Вариант ${i + 1}` });
  }
  await ctx.reply("Выбери вариант или перегенерируй:", Markup.inlineKeyboard([
    [Markup.button.callback("✅ Вариант 1", "variant_1"), Markup.button.callback("✅ Вариант 2", "variant_2")],
    [Markup.button.callback("🔄 Перегенерировать", "regen")]
  ]));
}

async function buildImageInput(ctx, order) {
  const inputs = [];
  for (const fileId of order.photos) {
    const link = await ctx.telegram.getFileLink(fileId);
    inputs.push(link.href);
  }
  const shopLogo = ctx.state.shop?.logo_template_url;
  if (shopLogo) {
    inputs.push(shopLogo);
  }
  return inputs;
}

async function waitForKieResult(taskId) {
  const maxAttempts = 90;
  const pollIntervalMs = 2000;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const raw = await queryTask(taskId);
    const record = Array.isArray(raw) ? raw[0] : raw;
    const data = record?.data || {};
    const status = String(
      data.state || data.status || data.taskStatus || data.resultStatus || ""
    ).toLowerCase();

    const urls = extractImageUrls(record);
    if (urls.length) {
      return record;
    }

    if (["success", "completed", "succeeded", "done", "finished"].includes(status)) {
      return record;
    }

    if (["failed", "error", "rejected", "cancelled"].includes(status)) {
      throw new Error(data.failMsg || "Ошибка генерации");
    }

    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  throw new Error("Таймаут генерации (180с)");
}

function extractImageUrls(record) {
  const urls = [];
  const pushIfUrl = (value) => {
    if (!value) {
      return;
    }
    if (typeof value === "string" && value.startsWith("http")) {
      urls.push(value);
    }
  };

  const collectFrom = (obj) => {
    if (!obj) {
      return;
    }
    if (Array.isArray(obj)) {
      obj.forEach(collectFrom);
      return;
    }
    pushIfUrl(obj.url || obj.image_url || obj.image_output || obj.output);
    if (obj.data) {
      collectFrom(obj.data);
    }
  };

  collectFrom(record?.data?.output);
  collectFrom(record?.data?.outputs);
  collectFrom(record?.data?.records);
  collectFrom(record?.data?.result?.image_output);
  const resultJson = record?.data?.resultJson;
  if (resultJson) {
    try {
      const parsed = typeof resultJson === "string" ? JSON.parse(resultJson) : resultJson;
      if (Array.isArray(parsed?.resultUrls)) {
        parsed.resultUrls.forEach(pushIfUrl);
      }
    } catch (err) {
      console.warn("failed to parse resultJson", err);
    }
  }
  return urls;
}

async function selectVariant(ctx, index) {
  const session = ensureSession(ctx);
  const order = session.newOrder;
  if (!order || !order.generation.variants[index]) {
    await ctx.answerCbQuery("Вариант не найден");
    return;
  }
  order.generation.selectedVariant = index;
  await ctx.answerCbQuery(`Выбран вариант ${index + 1}`);
  await finalizeOrder(ctx, order, index);
}

async function finalizeOrder(ctx, order, variantIndex) {
  const shop = ctx.state.shop;
  const variant = order.generation.variants[variantIndex];
  const buffer = await fetchImageBuffer(variant.url);
  const png = await sharp(buffer)
    .resize(1240, 1748)
    .withMetadata({ density: 300 })
    .png()
    .toBuffer();

  const pdf = await renderPdf(png);

  const orderRecord = await orders.createOrder({
    shopId: shop.id,
    operatorId: ctx.state.user.id,
    photosInput: order.photos,
    style: order.style,
    description: order.description,
    greetingText: order.greeting,
    variants: order.generation.variants.map((variant) => variant.url),
    chosenVariant: variantIndex + 1,
    regenCount: order.generation.regenCount
  });

  await generationLog.createGenerationLog({
    shopId: shop.id,
    orderId: orderRecord.id,
    operatorId: ctx.state.user.id,
    resolutionUsed: shop.resolution,
    is_regen: order.generation.regenCount > 0,
    api_credits_spent: variant.credits || 0
  });

  await shops.incrementGenerationsUsage(shop.id);

  await ctx.replyWithDocument({ source: png, filename: "card.png" });
  await ctx.replyWithDocument({ source: pdf, filename: "card.pdf" });
  await ctx.reply("Готово! /new — новый заказ.");
  const session = ensureSession(ctx);
  session.newOrder = null;
}

async function fetchImageBuffer(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Не удалось загрузить изображение");
  }
  return Buffer.from(await response.arrayBuffer());
}

function renderPdf(pngBuffer) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A6" });
    const chunks = [];
    doc.image(pngBuffer, { fit: [1240 * 0.75, 1748 * 0.75], align: "center", valign: "center" });
    doc.end();
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });
}

async function handleCallback(ctx) {
  const session = ensureSession(ctx);
  const data = ctx.callbackQuery?.data;
  if (!data) {
    return;
  }

  if (data === "skip_photos") {
    handleSkipPhotos(ctx);
    ctx.answerCbQuery();
    return;
  }
  if (data === "ready_photos") {
    handleReadyPhotos(ctx);
    return;
  }

  if (data.startsWith("style_")) {
    handleStyle(ctx, data.replace("style_", ""));
    return;
  }

  if (data === "edit_photos") {
    askForPhotos(ctx);
    ctx.answerCbQuery();
    return;
  }
  if (data === "edit_style") {
    askForStyle(ctx);
    ctx.answerCbQuery();
    return;
  }
  if (data === "edit_description") {
    askForDescription(ctx);
    ctx.answerCbQuery();
    return;
  }
  if (data === "edit_greeting") {
    askForGreeting(ctx);
    ctx.answerCbQuery();
    return;
  }
  if (data === "confirm_generate") {
    generateAndShowVariants(ctx).catch(async (err) => {
      console.error(err);
      await ctx.reply("Ошибка генерации. Попробуйте ещё раз.");
    });
    ctx.answerCbQuery("Генерация...");
    return;
  }

  if (data === "variant_1") {
    selectVariant(ctx, 0);
    return;
  }
  if (data === "variant_2") {
    selectVariant(ctx, 1);
    return;
  }
  if (data === "regen") {
    const session = ensureSession(ctx);
    const order = session.newOrder;
    const limit = ctx.state.shop?.regen_limit_per_order ?? 0;
    if (order.generation.regenCount >= limit) {
      await ctx.answerCbQuery("Лимит перегенераций исчерпан.");
      return;
    }
    order.generation.regenCount += 1;
    regenerateVariants(ctx).catch((err) => {
      console.error(err);
    });
    return;
  }
}

module.exports = {
  startNewOrder,
  handlePhoto,
  handleText,
  handleCallback
};
