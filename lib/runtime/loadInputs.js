// /lib/runtime/loadInputs.js
import { get } from "@vercel/blob";

const DATA_BLOB_PATH = "data.json";
const SCHEMA_BLOB_PATH = "Schema_operativo.json";
const MAX_SCHEMA_BYTES = 200_000;

async function streamToText(stream) {
  if (!stream) {
    throw new Error("fetch_error:empty_stream");
  }

  const response = new Response(stream);
  return await response.text();
}

async function readBlobJson(path, { maxBytes = null } = {}) {
  let result;

  try {
    result = await get(path);
  } catch {
    throw new Error(`fetch_error:blob_get_failed:${path}`);
  }

  if (!result || typeof result !== "object") {
    throw new Error(`fetch_error:blob_invalid_response:${path}`);
  }

  if (result.statusCode && result.statusCode !== 200) {
    throw new Error(`fetch_error:blob_status_${result.statusCode}:${path}`);
  }

  const text = await streamToText(result.stream);

  if (maxBytes !== null) {
    const size = new TextEncoder().encode(text).length;
    if (size > maxBytes) {
      throw new Error(`fetch_error:blob_too_large:${path}`);
    }
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`fetch_error:invalid_json:${path}`);
  }
}

export async function loadInputs() {
  const [data, schema] = await Promise.all([
    readBlobJson(DATA_BLOB_PATH),
    readBlobJson(SCHEMA_BLOB_PATH, { maxBytes: MAX_SCHEMA_BYTES })
  ]);

  return { data, schema };
}
