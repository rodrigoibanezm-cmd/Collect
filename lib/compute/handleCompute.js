// /lib/compute/handleCompute.js

import crypto from "crypto";

import { validateInput } from "../runtime/validateInput.js";
import { loadInputs } from "../runtime/loadInputs.js";
import { validateExecution } from "../runtime/validateExecution.js";

import { applyContract } from "../ingest/applyContract.js";
import { validatePrepared } from "../runtime/validatePrepared.js";

import { computeRunner } from "../engine/computeRunner.js";

import { formatOutput } from "./formatOutput.js";

const VALID_STATUS = new Set([
  "ok",
  "no_data",
  "incompatible_dataset",
  "insufficient_base"
]);

const VALID_REASONS = new Set([
  "no_base",
  "insufficient_options",
  "not_enough_n",
  "analysis_not_applicable"
]);

const STATUS_REASON = {
  no_data: ["no_base", "insufficient_options"],
  insufficient_base: ["not_enough_n"],
  incompatible_dataset: ["insufficient_options", "analysis_not_applicable"]
};

export async function handleCompute(input) {
  const trace_id = crypto.randomUUID();

  const cleanInput = {
    intent: input.intent,
    question_ref: input.question_ref,
    analysis_type: input.analysis_type,
    output_mode: input.output_mode
  };

  try {
    // 1. input (shape + catálogo + combinatoria)
    validateInput(cleanInput);

    // 2. load runtime inputs
    const { data, schema } = await loadInputs(cleanInput);

    // 3. ingest
    const prepared = applyContract(data, schema);

    // 4. validación técnica
    validatePrepared(prepared);

    // 5. validación analítica (ejecutabilidad)
    const execCheck = validateExecution(prepared, cleanInput);

    if (!execCheck || !execCheck.status) {
      throw new Error("invalid_execution_check");
    }

    if (!VALID_STATUS.has(execCheck.status)) {
      throw new Error("invalid_status");
    }

    if (execCheck.status !== "ok") {
      if (!VALID_REASONS.has(execCheck.reason)) {
        throw new Error("invalid_reason");
      }

      const allowed = STATUS_REASON[execCheck.status];
      if (allowed && !allowed.includes(execCheck.reason)) {
        throw new Error("invalid_status_reason_pair");
      }

      return formatOutput({
        trace_id,
        input: cleanInput,
        status: execCheck.status,
        reason: execCheck.reason
      });
    }

    // 6. compute
    const result = await computeRunner(prepared, cleanInput);

    // 7. output
    return formatOutput({
      trace_id,
      input: cleanInput,
      status: "ok",
      result
    });

  } catch (err) {
    // 🔴 fallback dentro de contrato (decisión de diseño)
    return formatOutput({
      trace_id,
      input: cleanInput,
      status: "incompatible_dataset",
      reason: "analysis_not_applicable"
    });
  }
}
