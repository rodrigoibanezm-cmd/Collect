// /lib/runtime/loadInputs.js
import { getDownloadUrl } from "@vercel/blob";

const DATA_BLOB_PATH = "data.json";
const SCHEMA_BLOB_PATH = "Schema_operativo.json";
const MAX_SCHEMA_BYTES = 200_000;

async function readBlobJson(path, { maxBytes = null } = {}) {
  let signedUrl;

  try {
    signedUrl = await getDownloadUrl(path);
  } catch {
    throw new Error(`fetch_error:blob_url_failed:${path}`);
  }

  if (!signedUrl || typeof signedUrl !== "string") {
    throw new Error(`fetch_error:blob_url_invalid:${path}`);
  }

  let response;
  try {
    response = await fetch(signedUrl);
  } catch {
    throw new Error(`fetch_error:blob_fetch_failed:${path}`);
  }

  if (!response.ok) {
    throw new Error(`fetch_error:blob_http_${response.status}:${path}`);
  }

  const text = await response.text();

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
