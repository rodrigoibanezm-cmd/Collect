// /lib/ingest/applyContract.js

export function applyContract(data, schema) {

  const ic = schema.input_contract;
  const varName = ic.target_variable;
  const unitId = ic.unit_id;

  const fieldDef = ic.structure.fields[varName];

  const missingValues = fieldDef.missing_values || [];
  const excludedValues = fieldDef.excluded_values || [];
  const allowedValues = fieldDef.allowed_values;

  const counts = new Map();
  const seen = new Set();

  let n_raw = data.length;
  let n_missing = 0;
  let n_invalid = 0;
  let n_excluded = 0;
  let n_valid = 0;
  let n_transformed = 0;
  let n_failed_transformation = 0;

  for (const row of data) {

    const id = row[unitId];

    // 🔴 duplicados (fail-safe: ignorar repetidos)
    if (seen.has(id)) {
      continue;
    }
    seen.add(id);

    const value = row[varName];

    // 🔴 ORDEN CORRECTO

    // 1. missing
    if (
      value === null ||
      value === undefined ||
      missingValues.includes(value)
    ) {
      n_missing++;
      continue;
    }

    // 2. invalid
    if (
      typeof value !== "number" ||
      !Number.isFinite(value)
    ) {
      n_invalid++;
      continue;
    }

    // 3. allowed_values (si no es dynamic)
    if (Array.isArray(allowedValues) && !allowedValues.includes(value)) {
      n_invalid++;
      continue;
    }

    // 4. excluded
    if (excludedValues.includes(value)) {
      n_excluded++;
      continue;
    }

    // 🔴 válido
    n_valid++;

    const key = String(value); // determinista simple

    counts.set(key, (counts.get(key) || 0) + 1);
    n_transformed++;
  }

  const universo_final = n_valid;

  const opciones = [];

  for (const [value, n] of counts.entries()) {

    const share = universo_final > 0 ? n / universo_final : 0;

    opciones.push({
      option_id: value,
      label: value,
      n,
      share
    });
  }

  // 🔴 ordenar
  opciones.sort((a, b) => b.n - a.n);

  // 🔴 control de opciones (drift)
  if (
    schema?.invariants?.max_options &&
    opciones.length > schema.invariants.max_options
  ) {
    throw new Error("contract_error:too_many_options");
  }

  const warnings = {
    dataset_level: [],
    option_level: []
  };

  if (n_valid === 0) {
    warnings.dataset_level.push("no_valid_cases");
  }

  return {
    opciones,
    metadata: {
      n_raw,
      n_valid,
      n_missing,
      n_invalid,
      n_excluded,
      n_transformed,
      n_failed_transformation,
      universo_final
    },
    warnings
  };
}
