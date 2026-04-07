// /api/compute.js

import crypto from "crypto";
import { validateRuntime } from "../lib/runtime/validateRuntime.js";
import { validatePrepared } from "../lib/runtime/validatePrepared.js";
import { applyContract } from "../lib/ingest/applyContract.js";
import { computeDiagnostico } from "../lib/engine/diagnostico.js";

const DATA_URL = "https://b6b05nw2aaqim7fm.public.blob.vercel-storage.com/data.json";
const SCHEMA_URL = "https://b6b05nw2aaqim7fm.public.blob.vercel-storage.com/Schema_operativo.json";
const CODEBOOK_URL = "https://b6b05nw2aaqim7fm.public.blob.vercel-storage.com/codebook.json";

const MAX_DATA_ROWS = 1_000_000;
const MAX_SCHEMA_BYTES = 200_000;
const MAX_CODEBOOK_BYTES = 500_000;
const FETCH_TIMEOUT = 8000;
const MAX_RETRIES = 2;

function respondError(res, type, detail, trace_id) {
  const status =
    type === "fetch_error" ? 502 :
    type === "runtime_error" ? 400 :
    type === "contract_error" ? 422 :
    type === "prepared_error" ? 422 :
    type === "compute_error" ? 422 :
    500;

  return res.status(status).json({ error: type, detail, trace_id });
}

async function fetchSafe(url, { maxBytes = null } = {}) {
  for (let i = 0; i <= MAX_RETRIES; i++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

    try {
      const response = await fetch(url, { signal: controller.signal });

      if (response.status >= 400 && response.status < 500) {
        throw new Error(`fetch_error:client_${response.status}`);
      }

      if (!response.ok) {
        throw new Error(`fetch_error:server_${response.status}`);
      }

      const text = await response.text();

      if (maxBytes !== null && Buffer.byteLength(text, "utf8") > maxBytes) {
        throw new Error("fetch_error:file_too_large");
      }

      try {
        return JSON.parse(text);
      } catch {
        throw new Error("fetch_error:invalid_json");
      }
    } catch (e) {
      const retryable =
        e.name === "AbortError" ||
        e.message.startsWith("fetch_error:server");

      if (!retryable || i === MAX_RETRIES) {
        throw e;
      }
    } finally {
      clearTimeout(timeout);
    }
  }
}

export default async function handler(req, res) {
  const start = Date.now();
  const trace_id = crypto.randomUUID();

  if (req.method !== "POST") {
    return respondError(res, "runtime_error", "method_not_allowed", trace_id);
  }

  try {
    let data, schema, codebook;

    try {
      [data, schema, codebook] = await Promise.all([
        fetchSafe(DATA_URL),
        fetchSafe(SCHEMA_URL, { maxBytes: MAX_SCHEMA_BYTES }),
        fetchSafe(CODEBOOK_URL, { maxBytes: MAX_CODEBOOK_BYTES })
      ]);
    } catch (e) {
      return respondError(res, "fetch_error", e.message, trace_id);
    }

    if (!schema?.contract_id || !schema?.contract_version) {
      return respondError(res, "runtime_error", "invalid_schema_contract", trace_id);
    }

    if (!Array.isArray(data)) {
      return respondError(res, "runtime_error", "invalid_data_shape", trace_id);
    }

    if (data.length > MAX_DATA_ROWS) {
      return respondError(res, "runtime_error", "dataset_too_large", trace_id);
    }

    try {
      validateRuntime(data, schema);
    } catch (e) {
      return respondError(res, "runtime_error", e.message, trace_id);
    }

    let prepared;
    try {
      prepared = applyContract(data, schema, codebook);
    } catch (e) {
      return respondError(res, "contract_error", e.message, trace_id);
    }

    try {
      validatePrepared(prepared, schema);
    } catch (e) {
      return respondError(res, "prepared_error", e.message, trace_id);
    }

    if (
      !prepared?.metadata ||
      typeof prepared.metadata.n_raw !== "number" ||
      typeof prepared.metadata.universo_final !== "number"
    ) {
      return respondError(res, "prepared_error", "invalid_metadata", trace_id);
    }

    const m = prepared.metadata;

    const warnings = {
      dataset_level: Array.isArray(prepared.warnings?.dataset_level)
        ? prepared.warnings.dataset_level
        : [],
      option_level: Array.isArray(prepared.warnings?.option_level)
        ? prepared.warnings.option_level
        : []
    };

    let result;
    try {
      result = computeDiagnostico(prepared);
    } catch (e) {
      return respondError(res, "compute_error", e.message, trace_id);
    }

    if (
      !result ||
      typeof result !== "object" ||
      Object.keys(result).length === 0
    ) {
      return respondError(res, "compute_error", "invalid_result", trace_id);
    }

    return res.status(200).json({
      trace_id,
      contract: {
        id: schema.contract_id,
        version: schema.contract_version
      },
      execution: {
        duration_ms: Date.now() - start,
        n_raw: m.n_raw,
        universo_final: m.universo_final
      },
      warnings,
      result
    });
  } catch (e) {
    const type =
      e.message?.startsWith("fetch_error") ? "fetch_error" :
      e.message?.startsWith("runtime_error") ? "runtime_error" :
      e.message?.startsWith("contract_error") ? "contract_error" :
      e.message?.startsWith("prepared_error") ? "prepared_error" :
      e.message?.startsWith("compute_error") ? "compute_error" :
      "internal_error";

    return respondError(res, type, e.message, trace_id);
  }
}
