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

  return catalog.every(
    (item) =>
      item &&
      typeof item === "object" &&
      typeof item.question_ref === "string" &&
      item.question_ref.trim() !== ""
  );
}

function resolveCatalogItem(catalog, question_ref) {
  return catalog.find((item) => item.question_ref === question_ref) || null;
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

  const catalogItem = resolveCatalogItem(catalog, question_ref);

  if (!catalogItem) {
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

  if (
    catalogItem.analysis_family !== null &&
    typeof catalogItem.analysis_family !== "string"
  ) {
    throw new Error("invalid_catalog_binding");
  }

  if (
    catalogItem.target_variable !== null &&
    typeof catalogItem.target_variable !== "string"
  ) {
    throw new Error("invalid_catalog_binding");
  }

  if (
    analysis_type === "resultado" ||
    analysis_type === "estabilidad" ||
    analysis_type === "segmentacion" ||
    analysis_type === "comparacion" ||
    analysis_type === "escenario"
  ) {
    if (
      typeof catalogItem.analysis_family !== "string" ||
      catalogItem.analysis_family.trim() === ""
    ) {
      throw new Error("missing_analysis_family");
    }

    if (
      typeof catalogItem.target_variable !== "string" ||
      catalogItem.target_variable.trim() === ""
    ) {
      throw new Error("missing_target_variable");
    }
  }

  return true;
}
