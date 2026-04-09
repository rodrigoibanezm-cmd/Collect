// /lib/compute/handleCompute.js

import crypto from "crypto";

import { loadInputs } from "../runtime/loadInputs.js";
import { validateInput } from "../runtime/validateInput.js";
import { validateExecution } from "../runtime/validateExecution.js";
import { validatePrepared } from "../runtime/validatePrepared.js";

import { applyContract } from "../ingest/applyContract.js";
import { computeRunner } from "../engine/computeRunner.js";

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

  const { data, schema, catalog, catalogItem, codebook } = await loadInputs(cleanInput);

  validateInput(cleanInput, catalog);

  if (!catalogItem || typeof catalogItem !== "object") {
    throw new Error("invalid_catalog_item");
  }

  const prepared = applyContract(data, schema, codebook);

  validatePrepared(prepared, schema);

  const execCheck = validateExecution(prepared, cleanInput);

  if (
    !execCheck ||
    typeof execCheck !== "object" ||
    Array.isArray(execCheck) ||
    typeof execCheck.status !== "string"
  ) {
    throw new Error("invalid_execution_check");
  }

  if (execCheck.status !== "ok") {
    if (typeof execCheck.reason !== "string" || execCheck.reason.trim() === "") {
      throw new Error("invalid_execution_reason");
    }

    return formatOutput({
      trace_id,
      input: cleanInput,
      status: execCheck.status,
      reason: execCheck.reason
    });
  }

  const result = await computeRunner(prepared, cleanInput);

  if (!result || typeof result !== "object" || Array.isArray(result)) {
    throw new Error("invalid_compute_result");
  }

  return formatOutput({
    trace_id,
    input: cleanInput,
    status: "ok",
    result
  });
}
