// /lib/compute/formatOutput.js

export function formatOutput({ trace_id, input, status, reason, result }) {
  if (!trace_id || typeof trace_id !== "string") {
    throw new Error("invalid_trace_id");
  }

  if (!input || typeof input !== "object") {
    throw new Error("invalid_input");
  }

  if (typeof status !== "string") {
    throw new Error("invalid_status");
  }

  const base = {
    trace_id,
    question_ref: input.question_ref,
    analysis_type: input.analysis_type,
    status
  };

  if (status !== "ok") {
    return {
      ...base,
      reason: typeof reason === "string" ? reason : "unknown_reason"
    };
  }

  if (!result || typeof result !== "object" || Array.isArray(result)) {
    throw new Error("invalid_result");
  }

  if (input.analysis_type === "resultado") {
    return {
      ...base,
      winner: result.winner,
      second: result.second,
      diff: result.diff,
      n: result.n
    };
  }

  if (input.analysis_type === "estabilidad") {
    return {
      ...base,
      p_value: result.p_value,
      significant: result.significant,
      diagnosis: result.diagnosis,
      n: result.n
    };
  }

  return {
    ...base,
    result
  };
}
