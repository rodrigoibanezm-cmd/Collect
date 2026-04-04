// /api/compute.js

import crypto from "crypto";

import { fetchSafe } from "../lib/runtime/fetchSafe.js";
import { validateRuntime } from "../lib/runtime/validateRuntime.js";
import { validatePrepared } from "../lib/runtime/validatePrepared.js";

import { applyContract } from "../lib/ingest/applyContract.js";
import { computeDiagnostico } from "../lib/engine/diagnostico.js";

// 🔴 DATA DESDE BLOB (FIJO)
const DATA_URL = "https://e7wkccr8ur62hidd.private.blob.vercel-storage.com/data.json";
const SCHEMA_URL = "https://e7wkccr8ur62hidd.private.blob.vercel-storage.com/Schema_operativo.json";

// 🔴 límite data
const MAX_DATA_ROWS = 1_000_000;

// 🔴 helper HTTP consistente
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

export default async function handler(req, res) {
  const trace_id = crypto.randomUUID();
  const start = Date.now();

  if (req.method !== "POST") {
    return respondError(res, "runtime_error", "method_not_allowed", trace_id);
  }

  try {

    // 🔴 FETCH
    let data, schema;
    try {
      [data, schema] = await Promise.all([
        fetchSafe(DATA_URL),
        fetchSafe(SCHEMA_URL, true)
      ]);
    } catch (e) {
      return respondError(res, "fetch_error", e.message, trace_id);
    }

    // 🔴 VALIDAR SCHEMA PARA RESPONSE
    if (!schema?.contract_id || !schema?.contract_version) {
      return respondError(res, "runtime_error", "invalid_schema_contract", trace_id);
    }

    // 🔴 CONTROL TAMAÑO DATA
    if (!Array.isArray(data)) {
      return respondError(res, "runtime_error", "invalid_data_shape", trace_id);
    }

    if (data.length > MAX_DATA_ROWS) {
      return respondError(res, "runtime_error", "dataset_too_large", trace_id);
    }

    // 🔴 VALIDATE RUNTIME
    try {
      validateRuntime(data, schema);
    } catch (e) {
      return respondError(res, "runtime_error", e.message, trace_id);
    }

    // 🔴 CONTRACT
    let prepared;
    try {
      prepared = applyContract(data, schema);
    } catch (e) {
      return respondError(res, "contract_error", e.message, trace_id);
    }

    // 🔴 VALIDATE PREPARED
    try {
      validatePrepared(prepared, schema);
    } catch (e) {
      return respondError(res, "prepared_error", e.message, trace_id);
    }

    // 🔴 VALIDAR METADATA COMPLETA
    if (
      !prepared?.metadata ||
      typeof prepared.metadata.n_raw !== "number" ||
      typeof prepared.metadata.universo_final !== "number"
    ) {
      return respondError(res, "prepared_error", "invalid_metadata", trace_id);
    }

    const m = prepared.metadata;

    // 🔴 SANEAR WARNINGS
    const warnings = {
      dataset_level: Array.isArray(prepared.warnings?.dataset_level)
        ? prepared.warnings.dataset_level
        : [],
      option_level: Array.isArray(prepared.warnings?.option_level)
        ? prepared.warnings.option_level
        : []
    };

    // 🔴 COMPUTE
    let result;
    try {
      result = computeDiagnostico(prepared);
    } catch (e) {
      return respondError(res, "compute_error", e.message, trace_id);
    }

    // 🔴 VALIDAR RESULT REAL
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

    // 🔴 CLASIFICACIÓN FINAL CONSISTENTE
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
