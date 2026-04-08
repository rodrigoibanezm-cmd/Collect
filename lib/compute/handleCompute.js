// /lib/compute/handleCompute.js

import crypto from "crypto";

import { loadInputs } from "../runtime/loadInputs.js";
import { validateInput } from "../runtime/validateInput.js";
import { validateExecution } from "../runtime/validateExecution.js";
import { validatePrepared } from "../runtime/validatePrepared.js";

import { applyContract } from "../ingest/applyContract.js";
import { computeDiagnostico } from "../engine/diagnostico.js";

import { formatOutput } from "./formatOutput.js";

export async function handleCompute(input) {
  const trace_id = crypto.randomUUID();

  const cleanInput = {
    intent: typeof input?.intent === "string" ? input.intent.trim().toLowerCase() : "",
    question_ref: typeof input?.question_ref === "string" ? input.question_ref.trim() : "",
    analysis_type:
      typeof input?.analysis_type === "string"
        ? input.analysis_type.trim().toLowerCase()
        : "",
    output_mode:
      typeof input?.output_mode === "string"
        ? input.output_mode.trim().toLowerCase()
        : ""
  };

  try {
    const { data, schema, catalog } = await loadInputs(cleanInput);

    validateInput(cleanInput, catalog);

    const prepared = applyContract(data, schema);

    validatePrepared(prepared);

    const execCheck = validateExecution(prepared, cleanInput);

    if (!execCheck || typeof execCheck.status !== "string") {
      throw new Error("invalid_execution_check");
    }

    if (execCheck.status !== "ok") {
      return formatOutput({
        trace_id,
        input: cleanInput,
        status: execCheck.status,
        reason: execCheck.reason
      });
    }

    const result = await computeDiagnostico(prepared);

    return formatOutput({
      trace_id,
      input: cleanInput,
      status: "ok",
      result
    });
  } catch (err) {
    return {
      trace_id,
      question_ref: cleanInput.question_ref,
      analysis_type: cleanInput.analysis_type,
      status: "internal_error",
      error: err?.message || "unknown_error"
    };
  }
}
