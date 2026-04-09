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
    question_ref:
      typeof input.question_ref === "string" ? input.question_ref : null,
    analysis_type:
      typeof input.analysis_type === "string" ? input.analysis_type : null,
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
      winner: result.winner ?? null,
      second: result.second ?? null,
      diff: result.diff ?? null,
      n: result.n ?? { winner: null, second: null }
    };
  }

  if (input.analysis_type === "estabilidad") {
    return {
      ...base,
      p_value: result.p_value ?? null,
      significant: result.significant ?? false,
      diagnosis: result.diagnosis ?? null,
      n: result.n ?? { winner: null, second: null }
    };
  }

  if (input.analysis_type === "segmentacion") {
    return {
      ...base,
      segments: Array.isArray(result.segments) ? result.segments : []
    };
  }

  return {
    ...base,
    result
  };
}
