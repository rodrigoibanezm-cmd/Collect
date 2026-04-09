// /lib/runtime/loadInputs.js

import { fetchSafe } from "./fetchSafe.js";

function normalizeCatalog(rawCatalog) {
  console.log("[loadInputs] normalizeCatalog:start", {
    is_array: Array.isArray(rawCatalog),
    length: Array.isArray(rawCatalog) ? rawCatalog.length : null
  });

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

  console.log("[loadInputs] normalizeCatalog:done", {
    refs: refs.length,
    uniqueRefs: uniqueRefs.length
  });

  if (uniqueRefs.length === 0) {
    throw new Error("invalid_catalog");
  }

  return uniqueRefs;
}

function validateSchemaShape(schema) {
  console.log("[loadInputs] validateSchemaShape:start", {
    has_schema: !!schema,
    type: typeof schema,
    has_input_contract: !!schema?.input_contract
  });

  if (!schema || typeof schema !== "object" || Array.isArray(schema)) {
    throw new Error("invalid_schema");
  }

  if (!schema.input_contract || typeof schema.input_contract !== "object") {
    throw new Error("invalid_schema");
  }
}

function validateDataShape(data) {
  console.log("[loadInputs] validateDataShape:start", {
    is_array: Array.isArray(data),
    length: Array.isArray(data) ? data.length : null
  });

  if (!Array.isArray(data)) {
    throw new Error("invalid_data");
  }
}

export async function loadInputs(input) {
  const { question_ref } = input || {};

  console.log("[loadInputs] start", { question_ref });

  if (typeof question_ref !== "string" || question_ref.trim() === "") {
    throw new Error("invalid_question_ref");
  }

  console.log("[loadInputs] env", {
    has_data_url: !!process.env.BLOB_DATA_URL,
    has_schema_url: !!process.env.BLOB_SCHEMA_URL,
    has_catalog_url: !!process.env.BLOB_SURVEY_CATALOG_URL
  });

  const [data, schema, surveyCatalog] = await Promise.all([
    fetchSafe(process.env.BLOB_DATA_URL, "invalid_data"),
    fetchSafe(process.env.BLOB_SCHEMA_URL, "invalid_schema"),
    fetchSafe(process.env.BLOB_SURVEY_CATALOG_URL, "invalid_catalog")
  ]);

  console.log("[loadInputs] fetchSafe ok", {
    data_type: Array.isArray(data) ? "array" : typeof data,
    schema_type: Array.isArray(schema) ? "array" : typeof schema,
    catalog_type: Array.isArray(surveyCatalog) ? "array" : typeof surveyCatalog
  });

  validateDataShape(data);
  validateSchemaShape(schema);

  const catalog = normalizeCatalog(surveyCatalog);

  console.log("[loadInputs] done", {
    data_rows: data.length,
    catalog_size: catalog.length
  });

  return {
    data,
    schema,
    catalog
  };
}
