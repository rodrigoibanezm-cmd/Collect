// /lib/runtime/loadInputs.js

import { fetchSafe } from "./fetchSafe.js";

const DATA_URL =
  "https://b6b05nw2aaqim7fm.public.blob.vercel-storage.com/data.json";

const SCHEMA_URL =
  "https://b6b05nw2aaqim7fm.public.blob.vercel-storage.com/Schema_operativo.json";

const SURVEY_CATALOG_URL =
  "https://b6b05nw2aaqim7fm.public.blob.vercel-storage.com/survey_catalog.json";

const CODEBOOK_URL =
  "https://b6b05nw2aaqim7fm.public.blob.vercel-storage.com/codebook.json";

function normalizeCatalog(rawCatalog) {
  if (!Array.isArray(rawCatalog)) {
    throw new Error("invalid_catalog");
  }

  const refs = rawCatalog
    .map((item) => {
      if (typeof item === "string") return item.trim();
      if (item && typeof item === "object" && typeof item.question_ref === "string") {
        return item.question_ref.trim();
      }
      return "";
    })
    .filter(Boolean);

  const uniqueRefs = [...new Set(refs)];

  if (uniqueRefs.length === 0) {
    throw new Error("invalid_catalog");
  }

  return uniqueRefs;
}

function validateSchemaShape(schema) {
  if (!schema || typeof schema !== "object" || Array.isArray(schema)) {
    throw new Error("invalid_schema");
  }

  if (!schema.input_contract || typeof schema.input_contract !== "object") {
    throw new Error("invalid_schema");
  }
}

function validateDataShape(data) {
  if (!Array.isArray(data)) {
    throw new Error("invalid_data");
  }
}

function validateCodebookShape(codebook) {
  if (!codebook || typeof codebook !== "object" || Array.isArray(codebook)) {
    throw new Error("invalid_codebook");
  }

  if (!codebook.variables || typeof codebook.variables !== "object") {
    throw new Error("invalid_codebook");
  }
}

function resolveTargetVariable(question_ref) {
  if (question_ref === "preferencia_nombre_programa_a_v1") {
    return "P11_A";
  }

  if (question_ref === "preferencia_nombre_programa_b_v1") {
    return "P11_B";
  }

  throw new Error("unsupported_question_ref");
}

function patchSchemaForQuestion(schema, question_ref) {
  const targetVariable = resolveTargetVariable(question_ref);

  const nextSchema = structuredClone(schema);

  nextSchema.input_contract.target_variable = targetVariable;

  if (
    nextSchema.input_contract?.structure?.fields &&
    !nextSchema.input_contract.structure.fields[targetVariable]
  ) {
    nextSchema.input_contract.structure.fields[targetVariable] = {
      type: "integer",
      allowed_values: "dynamic",
      max_distinct_values: 10,
      fail_if_exceeds: true,
      missing_values: [90, 99],
      excluded_values: [],
      nullable: false
    };
  }

  if (
    nextSchema.validation_contract?.cardinality &&
    !nextSchema.validation_contract.cardinality[targetVariable]
  ) {
    nextSchema.validation_contract.cardinality[targetVariable] = {
      min_responses: 0,
      max_responses: 1,
      enforce_uniqueness: true
    };
  }

  return nextSchema;
}

export async function loadInputs(input) {
  const { question_ref } = input || {};

  if (typeof question_ref !== "string" || question_ref.trim() === "") {
    throw new Error("invalid_question_ref");
  }

  const [data, rawSchema, surveyCatalog, codebook] = await Promise.all([
    fetchSafe(DATA_URL, "invalid_data"),
    fetchSafe(SCHEMA_URL, "invalid_schema"),
    fetchSafe(SURVEY_CATALOG_URL, "invalid_catalog"),
    fetchSafe(CODEBOOK_URL, "invalid_codebook")
  ]);

  validateDataShape(data);
  validateSchemaShape(rawSchema);
  validateCodebookShape(codebook);

  const catalog = normalizeCatalog(surveyCatalog);
  const schema = patchSchemaForQuestion(rawSchema, question_ref);

  return {
    data,
    schema,
    catalog,
    codebook
  };
}
