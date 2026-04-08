// /lib/compute/formatOutput.js

const VALID_STATUS = new Set([
  "ok",
  "no_data",
  "incompatible_dataset",
  "insufficient_base"
]);

const DIAGNOSIS_BY_STATUS = {
  no_data: "sin_base",
  incompatible_dataset: "dependiente",
  insufficient_base: "sin_base"
};

export function formatOutput({ trace_id, input, status, reason, result }) {
  if (!trace_id || typeof trace_id !== "string") {
    throw new Error("invalid_trace_id");
  }

  if (!input || typeof input !== "object") {
    throw new Error("invalid_input");
  }

  if (typeof status !== "string" || !VALID_STATUS.has(status)) {
    throw new Error("invalid_status");
  }

  const base = {
    trace_id,
    question_ref: input.question_ref,
    analysis_type: input.analysis_type
  };

  if (status !== "ok") {
    return {
      ...base,
      status,
      reason: typeof reason === "string" ? reason : "analysis_not_applicable",
      diagnosis: DIAGNOSIS_BY_STATUS[status] || "dependiente"
    };
  }

  if (!result || typeof result !== "object") {
    throw new Error("invalid_result");
  }

  return {
    ...base,
    status: "ok",
    winner: result.winner ?? null,
    second: result.second ?? null,
    diff: typeof result.diff === "number" ? result.diff : null,
    p_value: typeof result.p_value === "number" ? result.p_value : null,
    significant:
      typeof result.significant === "boolean" ? result.significant : null,
    n:
      result.n && typeof result.n === "object"
        ? result.n
        : { winner: null, second: null },
    diagnosis: typeof result.diagnosis === "string" ? result.diagnosis : null
  };
}
