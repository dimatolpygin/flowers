const { supabase } = require("./client");

async function uploadBuffer({ bucket, path, buffer, contentType }) {
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, buffer, {
      contentType,
      upsert: false
    });

  if (error) {
    throw new Error(`storage upload failed: ${error.message}`);
  }

  return data;
}

function getPublicFileUrl(bucket, path) {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

module.exports = {
  uploadBuffer,
  getPublicFileUrl
};
