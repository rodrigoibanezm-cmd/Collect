//// /lib/ingest/applyContract.js

export function applyContract(data, schema, codebook) {
  const ic = schema.input_contract;
  const varName = ic.target_variable;
  const unitId = ic.unit_id;

  if (typeof varName !== "string" || varName.trim() === "") {
    throw new Error("contract_error:missing_target_variable");
  }

  const fieldDef =
    ic?.structure?.fields?.[varName] || ic?.structure?.field_template;

  if (!fieldDef || typeof fieldDef !== "object") {
    throw new Error(`contract_error:missing_field_definition:${varName}`);
  }

  const missingValues = Array.isArray(fieldDef.missing_values)
    ? fieldDef.missing_values
    : [];

  const excludedValues = Array.isArray(fieldDef.excluded_values)
    ? fieldDef.excluded_values
    : [];

  const allowedValues = fieldDef.allowed_values;

  const coercionEnabled =
    schema?.validation_contract?.type_check?.coercion === true;

  const duplicateRule =
    schema?.validation_contract?.duplicate_control?.rule || "ignore";

  const codebookVar = codebook?.variables?.[varName];
  const valueLabels = codebookVar?.value_labels || {};

  const counts = new Map();
  const seen = new Set();

  let n_raw = Array.isArray(data) ? data.length : 0;
  let n_missing = 0;
  let n_invalid = 0;
  let n_excluded = 0;
  let n_valid = 0;
  let n_transformed = 0;
  let n_duplicates = 0;

  for (const row of data) {
    const id = row?.[unitId];

    if (seen.has(id)) {
      n_duplicates++;
      if (duplicateRule === "fail_if_duplicate") {
        throw new Error(`contract_error:duplicate_unit_id:${String(id)}`);
      }
      continue;
    }
    seen.add(id);

    let value = row?.[varName];

    if (coercionEnabled && typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed !== "") {
        const coerced = Number(trimmed);
        if (Number.isFinite(coerced)) {
          value = coerced;
        }
      }
    }

    if (
      value === null ||
      value === undefined ||
      missingValues.includes(value)
    ) {
      n_missing++;
      continue;
    }

    if (typeof value !== "number" || !Number.isFinite(value)) {
      n_invalid++;
      continue;
    }

    if (Array.isArray(allowedValues) && !allowedValues.includes(value)) {
      n_invalid++;
      continue;
    }

    if (excludedValues.includes(value)) {
      n_excluded++;
      continue;
    }

    n_valid++;

    const key = String(value);
    const label =
      typeof valueLabels[key] === "string" && valueLabels[key].trim() !== ""
        ? valueLabels[key].trim()
        : key;

    counts.set(key, {
      option_id: key,
      label,
      n: (counts.get(key)?.n || 0) + 1
    });

    n_transformed++;
  }

  const universo_final = n_valid;
  const n_total = universo_final;

  const options = [];

  for (const item of counts.values()) {
    const share = universo_final > 0 ? item.n / universo_final : 0;

    options.push({
      option_id: item.option_id,
      label: item.label,
      n: item.n,
      share
    });
  }

  options.sort((a, b) => b.n - a.n);

  if (
    schema?.invariants?.max_options &&
    options.length > schema.invariants.max_options
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

  // 🔴 SEGMENTACIÓN
  const segmentationConfig = schema?.segmentation_contract;
  let segments = [];

  if (segmentationConfig?.enabled === true) {
    const segmentDefs = Array.isArray(segmentationConfig.segments)
      ? segmentationConfig.segments
      : [];

    for (const segDef of segmentDefs) {
      const segVar = segDef?.variable;

      if (typeof segVar !== "string" || segVar.trim() === "") {
        continue;
      }

      const segCodebook = codebook?.variables?.[segVar];
      const segLabels = segCodebook?.value_labels || {};

      const segmentBuckets = new Map();

      for (const row of data) {
        let segValue = row?.[segVar];

        if (segValue === null || segValue === undefined) continue;

        if (coercionEnabled && typeof segValue === "string") {
          const trimmed = segValue.trim();
          if (trimmed !== "") {
            const coerced = Number(trimmed);
            if (Number.isFinite(coerced)) {
              segValue = coerced;
            }
          }
        }

        if (typeof segValue !== "number" || !Number.isFinite(segValue)) continue;

        const segKey = String(segValue);

        if (!segmentBuckets.has(segKey)) {
          segmentBuckets.set(segKey, []);
        }

        segmentBuckets.get(segKey).push(row);
      }

      for (const [segKey, rows] of segmentBuckets.entries()) {
        const minN = segDef?.min_n || 0;
        if (rows.length < minN) continue;

        const segLabel =
          typeof segLabels[segKey] === "string"
            ? segLabels[segKey]
            : segKey;

        const segCounts = new Map();
        const segSeen = new Set();

        for (const row of rows) {
          const id = row?.[unitId];

          if (segSeen.has(id)) continue;
          segSeen.add(id);

          let value = row?.[varName];

          if (coercionEnabled && typeof value === "string") {
            const trimmed = value.trim();
            if (trimmed !== "") {
              const coerced = Number(trimmed);
              if (Number.isFinite(coerced)) {
                value = coerced;
              }
            }
          }

          if (
            value === null ||
            value === undefined ||
            missingValues.includes(value)
          ) continue;

          if (typeof value !== "number" || !Number.isFinite(value)) continue;

          if (Array.isArray(allowedValues) && !allowedValues.includes(value))
            continue;

          if (excludedValues.includes(value)) continue;

          const key = String(value);
          const label =
            typeof valueLabels[key] === "string"
              ? valueLabels[key]
              : key;

          segCounts.set(key, {
            option_id: key,
            label,
            n: (segCounts.get(key)?.n || 0) + 1
          });
        }

        const segOptions = Array.from(segCounts.values()).sort(
          (a, b) => b.n - a.n
        );

        segments.push({
          segment: `${segVar}:${segLabel}`,
          options: segOptions
        });
      }
    }
  }

  return {
    options,
    segments,
    metadata: {
      n_raw,
      n_total,
      n_valid,
      n_missing,
      n_invalid,
      n_excluded,
      n_transformed,
      n_duplicates,
      universo_final
    },
    warnings
  };
}
