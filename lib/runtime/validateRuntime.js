// /lib/runtime/validateRuntime.js

const MAX_DATA_ROWS = 1_000_000;
const SUPPORTED_CONTRACT_VERSIONS = new Set(["2.0.0"]);

export function validateRuntime(data, schema) {
  // 🔴 DATA BASE

  if (!Array.isArray(data)) {
    throw new Error("runtime_error:invalid_data_shape");
  }

  if (data.length === 0) {
    throw new Error("runtime_error:empty_dataset");
  }

  if (data.length > MAX_DATA_ROWS) {
    throw new Error("runtime_error:dataset_too_large");
  }

  // 🔴 SCHEMA BASE

  if (!schema || typeof schema !== "object") {
    throw new Error("runtime_error:invalid_schema");
  }

  if (!schema.contract_id || typeof schema.contract_id !== "string") {
    throw new Error("runtime_error:missing_contract_id");
  }

  if (!schema.contract_version || typeof schema.contract_version !== "string") {
    throw new Error("runtime_error:missing_contract_version");
  }

  if (!SUPPORTED_CONTRACT_VERSIONS.has(schema.contract_version)) {
    throw new Error("runtime_error:unsupported_contract_version");
  }

  // 🔴 INPUT CONTRACT

  if (!schema.input_contract) {
    throw new Error("runtime_error:missing_input_contract");
  }

  const ic = schema.input_contract;

  if (!ic.unit_id || typeof ic.unit_id !== "string") {
    throw new Error("runtime_error:invalid_unit_id");
  }

  if (!ic.target_variable || typeof ic.target_variable !== "string") {
    throw new Error("runtime_error:invalid_target_variable");
  }

  if (!ic.structure || typeof ic.structure !== "object") {
    throw new Error("runtime_error:missing_structure");
  }

  if (!ic.structure.fields || typeof ic.structure.fields !== "object") {
    throw new Error("runtime_error:missing_fields");
  }

  const fields = ic.structure.fields;

  if (!fields[ic.unit_id]) {
    throw new Error("runtime_error:missing_unit_field");
  }

  // 🔴 target_variable puede venir por runtime
  // si no está declarado explícitamente en fields, se acepta
  // mientras exista la columna en data

  const targetDef = fields[ic.target_variable] || {
    type: "integer"
  };

  if (!targetDef.type) {
    throw new Error("runtime_error:missing_field_type");
  }

  // 🔴 VALIDACIÓN DE DATA REAL

  const first = data[0];

  if (typeof first !== "object" || first === null) {
    throw new Error("runtime_error:invalid_row_structure");
  }

  console.log("unit_id esperado:", ic.unit_id);
  console.log("target_variable esperado:", ic.target_variable);
  console.log("keys en first row:", Object.keys(first).slice(0, 15));

  if (!(ic.unit_id in first)) {
    throw new Error("runtime_error:unit_field_not_in_data");
  }

  if (!(ic.target_variable in first)) {
    throw new Error("runtime_error:target_field_not_in_data");
  }

  // 🔴 VALIDACIÓN POR FILA

  for (let i = 0; i < data.length; i++) {
    const row = data[i];

    if (typeof row !== "object" || row === null) {
      throw new Error("runtime_error:invalid_row");
    }

    if (!(ic.unit_id in row)) {
      throw new Error("runtime_error:missing_unit_value");
    }

    if (row[ic.unit_id] === null || row[ic.unit_id] === undefined) {
      throw new Error("runtime_error:null_unit_value");
    }

    if (!(ic.target_variable in row)) {
      throw new Error("runtime_error:missing_target_value");
    }

    if (row[ic.target_variable] === undefined) {
      throw new Error("runtime_error:undefined_target_value");
    }
  }

  // 🔴 INVARIANTS BASE

  if (!schema.invariants || typeof schema.invariants !== "object") {
    throw new Error("runtime_error:missing_invariants");
  }

  if (
    typeof schema.invariants.max_options !== "number" ||
    schema.invariants.max_options <= 0
  ) {
    throw new Error("runtime_error:invalid_max_options");
  }
}
