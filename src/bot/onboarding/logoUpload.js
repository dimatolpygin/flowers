const { config } = require("../../config");
const { storage, shops } = require("../../db");

function findUploadedFile(ctx) {
  if (ctx.message?.document) {
    return {
      fileId: ctx.message.document.file_id,
      mimeType: ctx.message.document.mime_type || "image/png"
    };
  }

  if (ctx.message?.photo?.length) {
    const photo = ctx.message.photo[ctx.message.photo.length - 1];
    return {
      fileId: photo.file_id,
      mimeType: photo.mime_type || "image/png"
    };
  }

  return null;
}

async function handleLogoUpload(ctx, next) {
  const onboarding = ctx.session?.onboarding;
  if (!onboarding || onboarding.type !== "logo") {
    return next();
  }

  const uploaded = findUploadedFile(ctx);
  if (!uploaded) {
    await ctx.reply("Пожалуйста, загрузите PNG-логотип (прозрачный фон, минимум 500×500)." );
    return;
  }

  if (uploaded.mimeType && !uploaded.mimeType.includes("png")) {
    await ctx.reply("Логотип должен быть PNG. Пожалуйста, загрузите файл в формате PNG.");
    return;
  }

  try {
    const fileInfo = await ctx.telegram.getFile(uploaded.fileId);
    const fileUrl = `https://api.telegram.org/file/bot${config.botToken}/${fileInfo.file_path}`;
    const response = await fetch(fileUrl);
    if (!response.ok) {
      throw new Error(`telegram file download failed (${response.status})`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const bucket = config.supabaseBucketLogos;
    const path = `shop-${onboarding.shopId}/logo-${Date.now()}.png`;

    await storage.uploadBuffer({
      bucket,
      path,
      buffer,
      contentType: uploaded.mimeType || "image/png"
    });

    const publicUrl = storage.getPublicFileUrl(bucket, path);
    await shops.updateShopLogoTemplateUrl(onboarding.shopId, publicUrl);

    ctx.session.onboarding = null;

    await ctx.reply(
      "Логотип сохранён ✅ Магазин готов к работе!", 
      { reply_markup: { remove_keyboard: true } }
    );
    await ctx.reply("Скоро появится меню доступных команд.");
  } catch (error) {
    console.error("logo upload failed", error);
    await ctx.reply("Не удалось сохранить логотип. Попробуйте ещё раз.");
  }
}

module.exports = {
  handleLogoUpload
};
