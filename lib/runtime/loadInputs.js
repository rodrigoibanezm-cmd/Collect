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

  const items = rawCatalog.filter(
    (item) =>
      item &&
      typeof item === "object" &&
      typeof item.question_ref === "string" &&
      item.question_ref.trim() !== ""
  );

  if (items.length === 0) {
    throw new Error("invalid_catalog");
  }

  return items;
}

function validateSchemaShape(schema) {
  if (!schema || typeof schema !== "object" || Array.isArray(schema)) {
    throw new Error("invalid_schema");
  }

  if (!schema.input_contract || typeof schema.input_contract !== "object") {
    throw new Error("invalid_schema");
  }

  if (
    !schema.input_contract.question_binding ||
    typeof schema.input_contract.question_binding !== "object"
  ) {
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

function resolveCatalogItem(catalog, question_ref) {
  const item = catalog.find(
    (entry) => entry.question_ref === question_ref
  );

  if (!item) {
    throw new Error("unknown_question_ref");
  }

  return item;
}

function bindSchemaToQuestion(schema, catalogItem) {
  const targetVariable = catalogItem?.target_variable;
  const analysisFamily = catalogItem?.analysis_family;

  if (typeof targetVariable !== "string" || targetVariable.trim() === "") {
    throw new Error("invalid_target_variable");
  }

  if (typeof analysisFamily !== "string" || analysisFamily.trim() === "") {
    throw new Error("invalid_analysis_family");
  }

  const expectedFamily =
    schema?.input_contract?.question_binding?.analysis_family_must_equal;

  if (
    typeof expectedFamily === "string" &&
    expectedFamily.trim() !== "" &&
    analysisFamily !== expectedFamily
  ) {
    throw new Error("invalid_analysis_family");
  }

  const nextSchema = structuredClone(schema);

  nextSchema.input_contract.target_variable = targetVariable;

  if (!nextSchema.input_contract.structure) {
    nextSchema.input_contract.structure = {};
  }

  if (!nextSchema.input_contract.structure.fields) {
    nextSchema.input_contract.structure.fields = {};
  }

  if (!nextSchema.input_contract.structure.fields[targetVariable]) {
    nextSchema.input_contract.structure.fields[targetVariable] = {
      ...nextSchema.input_contract.structure.field_template
    };
  }

  if (!nextSchema.validation_contract) {
    nextSchema.validation_contract = {};
  }

  if (!nextSchema.validation_contract.cardinality) {
    nextSchema.validation_contract.cardinality = {};
  }

  if (!nextSchema.validation_contract.cardinality[targetVariable]) {
    nextSchema.validation_contract.cardinality[targetVariable] = {
      ...nextSchema.validation_contract.cardinality_template
    };
  }

  return nextSchema;
}

export async function loadInputs(input) {
  const { question_ref } = input || {};

  if (typeof question_ref !== "string" || question_ref.trim() === "") {
    throw new Error("invalid_question_ref");
  }

  const [data, rawSchema, rawCatalog, codebook] = await Promise.all([
    fetchSafe(DATA_URL, "invalid_data"),
    fetchSafe(SCHEMA_URL, "invalid_schema"),
    fetchSafe(SURVEY_CATALOG_URL, "invalid_catalog"),
    fetchSafe(CODEBOOK_URL, "invalid_codebook")
  ]);

  validateDataShape(data);
  validateSchemaShape(rawSchema);
  validateCodebookShape(codebook);

  const catalog = normalizeCatalog(rawCatalog);
  const catalogItem = resolveCatalogItem(catalog, question_ref);
  const schema = bindSchemaToQuestion(rawSchema, catalogItem);

  return {
    data,
    schema,
    catalog,
    catalogItem,
    codebook
  };
}
