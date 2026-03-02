const { config } = require("../../config");

async function kieRequest(path, options = {}) {
  const response = await fetch(`${config.kieApiBaseUrl}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${config.kieApiKey}`,
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const msg = payload?.msg || `Kie API error (${response.status})`;
    const error = new Error(msg);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
}

async function createTask({ prompt, imageInput = [], aspectRatio = "3:4", resolution = "2K", outputFormat = "png", googleSearch = false }) {
  return kieRequest("/api/v1/jobs/createTask", {
    method: "POST",
    body: JSON.stringify({
      model: config.kieModel,
      input: {
        prompt,
        image_input: imageInput,
        aspect_ratio: aspectRatio,
        google_search: googleSearch,
        resolution,
        output_format: outputFormat
      }
    })
  });
}

async function queryTask(taskId) {
  const encodedTaskId = encodeURIComponent(taskId);
  return kieRequest(`/api/v1/jobs/queryRecord?taskId=${encodedTaskId}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json"
    }
  });
}

module.exports = {
  createTask,
  queryTask
};
