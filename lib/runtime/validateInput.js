// /lib/runtime/validateInput.js

const VALID_INTENTS = new Set([
  "diagnostico",
  "ranking",
  "segmentacion",
  "comparacion",
  "escenario"
]);

const VALID_ANALYSIS_TYPES = new Set([
  "resultado",
  "estabilidad",
  "segmentacion",
  "comparacion",
  "escenario"
]);

const VALID_OUTPUT_MODES = new Set([
  "ejecutivo",
  "analista",
  "cliente"
]);

const VALID_COMBINATIONS = {
  diagnostico: new Set(["resultado", "estabilidad"]),
  ranking: new Set(["resultado"]),
  segmentacion: new Set(["segmentacion"]),
  comparacion: new Set(["comparacion"]),
  escenario: new Set(["escenario"])
};

const ALLOWED_KEYS = new Set([
  "intent",
  "question_ref",
  "analysis_type",
  "output_mode"
]);

function isValidCatalog(catalog) {
  if (!Array.isArray(catalog) || catalog.length === 0) return false;
  return catalog.every((item) => typeof item === "string" && item.trim() !== "");
}

export function validateInput(input, catalog) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("invalid_input_shape");
  }

  const keys = Object.keys(input);
  for (const key of keys) {
    if (!ALLOWED_KEYS.has(key)) {
      throw new Error("extra_field_not_allowed");
    }
  }

  if (!isValidCatalog(catalog)) {
    throw new Error("invalid_catalog");
  }

  const { intent, question_ref, analysis_type, output_mode } = input;

  if (typeof intent !== "string" || !VALID_INTENTS.has(intent)) {
    throw new Error("invalid_intent");
  }

  if (typeof question_ref !== "string" || question_ref.trim() === "") {
    throw new Error("invalid_question_ref");
  }

  if (!catalog.includes(question_ref)) {
    throw new Error("unknown_question_ref");
  }

  if (
    typeof analysis_type !== "string" ||
    !VALID_ANALYSIS_TYPES.has(analysis_type)
  ) {
    throw new Error("invalid_analysis_type");
  }

  if (
    typeof output_mode !== "string" ||
    !VALID_OUTPUT_MODES.has(output_mode)
  ) {
    throw new Error("invalid_output_mode");
  }

  const allowedAnalysis = VALID_COMBINATIONS[intent];
  if (!allowedAnalysis || !allowedAnalysis.has(analysis_type)) {
    throw new Error("invalid_intent_analysis_combination");
  }

  return true;
}
