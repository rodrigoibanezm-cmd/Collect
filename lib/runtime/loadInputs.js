// /lib/runtime/loadInputs.js
import { list, getDownloadUrl } from "@vercel/blob";

const DATA_BLOB_PATH = "data.json";
const SCHEMA_BLOB_PATH = "Schema_operativo.json";
const MAX_SCHEMA_BYTES = 200_000;

async function readBlobJson(pathname, { maxBytes = null } = {}) {
  let blobsResult;
  try {
    blobsResult = await list({
      prefix: pathname,
      token: process.env.BLOB_READ_WRITE_TOKEN
    });
  } catch {
    throw new Error(`fetch_error:blob_list_failed:${pathname}`);
  }

  const blobs = Array.isArray(blobsResult?.blobs) ? blobsResult.blobs : [];
  const match = blobs.find((b) => b?.pathname === pathname);
  if (!match?.url) {
    throw new Error(`fetch_error:blob_not_found:${pathname}`);
  }

  let signedUrl;
  try {
    signedUrl = await getDownloadUrl(match.url, {
      token: process.env.BLOB_READ_WRITE_TOKEN
    });
    console.log("signedUrl type:", typeof signedUrl, JSON.stringify(signedUrl));
  } catch {
    throw new Error(`fetch_error:blob_url_failed:${pathname}`);
  }

  let response;
  try {
    response = await fetch(signedUrl);
  } catch {
    throw new Error(`fetch_error:blob_fetch_failed:${pathname}`);
  }

  if (!response.ok) {
    throw new Error(`fetch_error:blob_http_${response.status}:${pathname}`);
  }

  const text = await response.text();

  if (maxBytes !== null) {
    const size = new TextEncoder().encode(text).length;
    if (size > maxBytes) {
      throw new Error(`fetch_error:blob_too_large:${pathname}`);
    }
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`fetch_error:invalid_json:${pathname}`);
  }
}

export async function loadInputs() {
  const [data, schema] = await Promise.all([
    readBlobJson(DATA_BLOB_PATH),
    readBlobJson(SCHEMA_BLOB_PATH, { maxBytes: MAX_SCHEMA_BYTES })
  ]);
  return { data, schema };
}
