// /api/compute.js
import crypto from "crypto";
import fs from "fs/promises";
import path from "path";

import { validateRuntime } from "../lib/runtime/validateRuntime.js";
import { validatePrepared } from "../lib/runtime/validatePrepared.js";

import { applyContract } from "../lib/ingest/applyContract.js";
import { computeDiagnostico } from "../lib/engine/diagnostico.js";

const MAX_DATA_ROWS = 1_000_000;
const MAX_SCHEMA_BYTES = 200_000;

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

async function readJsonFile(relativePath, { maxBytes = null } = {}) {
  const absolutePath = path.join(process.cwd(), relativePath);

  let text;
  try {
    text = await fs.readFile(absolutePath, "utf8");
  } catch {
    throw new Error(`fetch_error:file_not_found:${relativePath}`);
  }

  if (maxBytes !== null) {
    const size = new TextEncoder().encode(text).length;
    if (size > maxBytes) {
      throw new Error(`fetch_error:file_too_large:${relativePath}`);
    }
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`fetch_error:invalid_json:${relativePath}`);
  }
}

export default async function handler(req, res) {
  const trace_id = crypto.randomUUID();
  const start = Date.now();

  if (req.method !== "POST") {
    return respondError(res, "runtime_error", "method_not_allowed", trace_id);
  }

  try {
    let data, schema;
    try {
      [data, schema] = await Promise.all([
        readJsonFile("data/data.json"),
        readJsonFile("data/Schema_operativo.json", { maxBytes: MAX_SCHEMA_BYTES })
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
      prepared = applyContract(data, schema);
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
