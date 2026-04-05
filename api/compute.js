// /api/compute.js
import crypto from "crypto";

import { loadInputs } from "../lib/runtime/loadInputs.js";
import { validateRuntime } from "../lib/runtime/validateRuntime.js";
import { validatePrepared } from "../lib/runtime/validatePrepared.js";

import { applyContract } from "../lib/ingest/applyContract.js";
import { computeDiagnostico } from "../lib/engine/diagnostico.js";

const MAX_DATA_ROWS = 1_000_000;

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
    let data, schema, codebook;

    try {
      ({ data, schema, codebook } = await loadInputs());
    } catch (e) {
      return respondError(res, "fetch_error", e.message, trace_id);
    }

    if (!schema?.contract_id || !schema?.contract_version) {
      return respondError(res, "runtime_error", "invalid_schema_contract", trace_id);
    }

    if (!codebook || typeof codebook !== "object" || !codebook.variables) {
      return respondError(res, "runtime_error", "invalid_codebook", trace_id);
    }

    if (!Array.isArray(data)) {
      return respondError(res, "runtime_error", "invalid_data_shape", trace_id);
    }

    if (data.length > MAX_DATA_ROWS) {
      return respondError(res, "runtime_error", "dataset_too_large", trace_id);
    }

    const requestedTarget = req.body?.target_variable;
    const targetVariable =
      typeof requestedTarget === "string" && requestedTarget.trim() !== ""
        ? requestedTarget.trim()
        : schema?.input_contract?.target_variable;

    if (!targetVariable) {
      return respondError(res, "runtime_error", "missing_target_variable", trace_id);
    }

    if (!codebook?.variables?.[targetVariable]) {
      return respondError(res, "runtime_error", `unknown_target_variable:${targetVariable}`, trace_id);
    }

    const runtimeSchema = {
      ...schema,
      input_contract: {
        ...schema.input_contract,
        target_variable: targetVariable
      }
    };

    try {
      validateRuntime(data, runtimeSchema);
    } catch (e) {
      return respondError(res, "runtime_error", e.message, trace_id);
    }

    let prepared;
    try {
      prepared = applyContract(data, runtimeSchema, codebook);
    } catch (e) {
      return respondError(res, "contract_error", e.message, trace_id);
    }

    try {
      validatePrepared(prepared, runtimeSchema);
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
        id: runtimeSchema.contract_id,
        version: runtimeSchema.contract_version
      },
      execution: {
        duration_ms: Date.now() - start,
        n_raw: m.n_raw,
        universo_final: m.universo_final,
        target_variable: targetVariable
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
