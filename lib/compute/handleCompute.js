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

  console.log("[compute] start", { trace_id, cleanInput });

  const { data, schema, catalog } = await loadInputs(cleanInput);
  console.log("[compute] loadInputs ok", {
    trace_id,
    data_rows: Array.isArray(data) ? data.length : null,
    has_schema: !!schema,
    catalog_size: Array.isArray(catalog) ? catalog.length : null
  });

  validateInput(cleanInput, catalog);
  console.log("[compute] validateInput ok", { trace_id });

  const prepared = applyContract(data, schema);
  console.log("[compute] applyContract ok", {
    trace_id,
    options: Array.isArray(prepared?.options) ? prepared.options.length : null,
    universo_final: prepared?.metadata?.universo_final ?? null
  });

  validatePrepared(prepared, schema);
  console.log("[compute] validatePrepared ok", { trace_id });

  const execCheck = validateExecution(prepared, cleanInput, schema);
  console.log("[compute] validateExecution ok", { trace_id, execCheck });

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

    console.log("[compute] early_exit", { trace_id, execCheck });

    return formatOutput({
      trace_id,
      input: cleanInput,
      status: execCheck.status,
      reason: execCheck.reason
    });
  }

  const result = await computeRunner(prepared, cleanInput);
  console.log("[compute] computeRunner ok", { trace_id, result });

  if (!result || typeof result !== "object" || Array.isArray(result)) {
    throw new Error("invalid_compute_result");
  }

  const output = formatOutput({
    trace_id,
    input: cleanInput,
    status: "ok",
    result
  });

  console.log("[compute] done", { trace_id, output });

  return output;
}
