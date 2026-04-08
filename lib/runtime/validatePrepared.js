// /lib/runtime/validatePrepared.js

export function validatePrepared(prepared, schema) {
  if (!prepared || typeof prepared !== "object") {
    throw new Error("prepared_error:invalid_object");
  }

  if (!Array.isArray(prepared.options)) {
    throw new Error("prepared_error:invalid_options");
  }

  if (!prepared.metadata || typeof prepared.metadata !== "object") {
    throw new Error("prepared_error:missing_metadata");
  }

  const { options, metadata: m } = prepared;

  if (typeof m.universo_final !== "number" || m.universo_final < 0) {
    throw new Error("prepared_error:invalid_universe");
  }

  if (typeof m.n_raw !== "number" || m.n_raw < 0) {
    throw new Error("prepared_error:invalid_n_raw");
  }

  if (m.n_raw < m.universo_final) {
    throw new Error("prepared_error:invalid_counts");
  }

  const ids = new Set();

  for (const o of options) {
    if (typeof o.option_id !== "string" || o.option_id.length === 0) {
      throw new Error("prepared_error:invalid_option_id");
    }

    if (ids.has(o.option_id)) {
      throw new Error("prepared_error:duplicate_option_id");
    }
    ids.add(o.option_id);

    if (
      typeof o.n !== "number" ||
      !Number.isInteger(o.n) ||
      o.n < 0
    ) {
      throw new Error("prepared_error:invalid_n");
    }

    if (
      typeof o.share !== "number" ||
      !Number.isFinite(o.share) ||
      o.share < 0 ||
      o.share > 1
    ) {
      throw new Error("prepared_error:invalid_share");
    }
  }

  const sumShares = options.reduce((a, o) => a + o.share, 0);
  if (m.universo_final > 0 && Math.abs(sumShares - 1) > 0.00001) {
    throw new Error("prepared_error:invalid_share_sum");
  }

  const sumN = options.reduce((a, o) => a + o.n, 0);
  if (sumN !== m.universo_final) {
    throw new Error("prepared_error:invalid_n_sum");
  }

  if (m.universo_final > 0) {
    for (const o of options) {
      const expected = o.n / m.universo_final;
      if (Math.abs(expected - o.share) > 0.00001) {
        throw new Error("prepared_error:share_mismatch");
      }
    }
  }

  if (
    schema?.invariants?.max_options &&
    options.length > schema.invariants.max_options
  ) {
    throw new Error("prepared_error:too_many_options");
  }

  if (
    schema?.invariants?.minimum_options &&
    options.length < schema.invariants.minimum_options
  ) {
    throw new Error("prepared_error:not_enough_options");
  }
}
