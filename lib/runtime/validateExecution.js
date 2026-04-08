// /lib/runtime/validateExecution.js

const VALID_ANALYSIS_TYPES = new Set([
  "resultado",
  "estabilidad",
  "segmentacion",
  "comparacion",
  "escenario"
]);

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

export function validateExecution(prepared, input) {
  if (!prepared || typeof prepared !== "object") {
    throw new Error("invalid_prepared");
  }

  if (!input || typeof input !== "object") {
    throw new Error("invalid_input");
  }

  const analysis_type = input.analysis_type;

  if (
    typeof analysis_type !== "string" ||
    !VALID_ANALYSIS_TYPES.has(analysis_type)
  ) {
    throw new Error("invalid_analysis_type");
  }

  const metadata = prepared.metadata || {};
  const universo_final =
    typeof metadata.universo_final === "number" ? metadata.universo_final : 0;

  if (metadata.question_present === false) {
    return {
      status: "no_data",
      reason: "no_base"
    };
  }

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

  if (analysis_type === "segmentacion") {
    return {
      status: "ok"
    };
  }

  if (analysis_type === "comparacion") {
    return {
      status: "ok"
    };
  }

  if (analysis_type === "escenario") {
    return {
      status: "incompatible_dataset",
      reason: "analysis_not_applicable"
    };
  }

  return {
    status: "incompatible_dataset",
    reason: "analysis_not_applicable"
  };
}
