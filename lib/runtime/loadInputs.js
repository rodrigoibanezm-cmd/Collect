// /lib/runtime/loadInputs.js

import { fetchSafe } from "./fetchSafe.js";

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

export async function loadInputs(input) {
  const { question_ref } = input || {};

  if (typeof question_ref !== "string" || question_ref.trim() === "") {
    throw new Error("invalid_question_ref");
  }

  const [data, schema, surveyCatalog] = await Promise.all([
    fetchSafe(process.env.BLOB_DATA_URL, "invalid_data"),
    fetchSafe(process.env.BLOB_SCHEMA_URL, "invalid_schema"),
    fetchSafe(process.env.BLOB_SURVEY_CATALOG_URL, "invalid_catalog")
  ]);

  validateDataShape(data);
  validateSchemaShape(schema);

  const catalog = normalizeCatalog(surveyCatalog);

  return {
    data,
    schema,
    catalog
  };
}
