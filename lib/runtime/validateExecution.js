// /lib/runtime/validateExecution.js

const MIN_N = 30;

function getOptions(prepared) {
  return Array.isArray(prepared?.options) ? prepared.options : [];
}

function getValidOptions(options) {
  return options.filter(
    (option) =>
      option &&
      typeof option === "object" &&
      Number.isFinite(option.n) &&
      option.n > 0
  );
}

function hasValidSegment(segments) {
  return segments.some((seg) => {
    const options = Array.isArray(seg?.options) ? seg.options : [];

    return options.some(
      (o) =>
        o &&
        typeof o === "object" &&
        Number.isFinite(o.n) &&
        o.n > 0
    );
  });
}

export function validateExecution(prepared, input) {
  if (!prepared || typeof prepared !== "object") {
    throw new Error("invalid_prepared");
  }

  if (!input || typeof input !== "object") {
    throw new Error("invalid_input");
  }

  const analysis_type = input.analysis_type;

  if (typeof analysis_type !== "string" || analysis_type.trim() === "") {
    throw new Error("invalid_analysis_type");
  }

  // 🔴 SEGMENTACIÓN
  if (analysis_type === "segmentacion") {
    const segments = prepared?.segments;

    if (!Array.isArray(segments) || segments.length === 0) {
      return {
        status: "incompatible_dataset",
        reason: "insufficient_options"
      };
    }

    if (!hasValidSegment(segments)) {
      return {
        status: "incompatible_dataset",
        reason: "insufficient_options"
      };
    }

    return { status: "ok" };
  }

  const metadata = prepared.metadata || {};
  const universo_final =
    typeof metadata.universo_final === "number" ? metadata.universo_final : 0;

  if (universo_final === 0) {
    return {
      status: "no_data",
      reason: "no_base"
    };
  }

  const options = getOptions(prepared);
  const validOptions = getValidOptions(options);

  if (validOptions.length === 0) {
    return {
      status: "incompatible_dataset",
      reason: "insufficient_options"
    };
  }

  if (analysis_type === "resultado") {
    return {
      status: "ok"
    };
  }

  if (validOptions.length < 2) {
    return {
      status: "incompatible_dataset",
      reason: "insufficient_options"
    };
  }

  const sortedNs = validOptions
    .map((option) => option.n)
    .sort((a, b) => b - a);

  const top2_n = sortedNs[1] || 0;

  if (top2_n < MIN_N) {
    return {
      status: "insufficient_base",
      reason: "not_enough_n"
    };
  }

  if (analysis_type === "estabilidad") {
    return {
      status: "ok"
    };
  }

  return {
    status: "incompatible_dataset",
    reason: "analysis_not_applicable"
  };
}
