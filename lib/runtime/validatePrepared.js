// /lib/runtime/validatePrepared.js

export function validatePrepared(prepared, schema) {

  // 🔴 SHAPE mínimo
  if (!prepared || typeof prepared !== "object") {
    throw new Error("prepared_error:invalid_object");
  }

  if (!Array.isArray(prepared.opciones)) {
    throw new Error("prepared_error:invalid_opciones");
  }

  if (prepared.opciones.length === 0) {
    throw new Error("prepared_error:empty_opciones");
  }

  if (!prepared.metadata || typeof prepared.metadata !== "object") {
    throw new Error("prepared_error:missing_metadata");
  }

  const { opciones, metadata: m } = prepared;

  // 🔴 METADATA (primero)
  if (typeof m.universo_final !== "number" || m.universo_final < 0) {
    throw new Error("prepared_error:invalid_universe");
  }

  if (typeof m.n_raw !== "number" || m.n_raw < 0) {
    throw new Error("prepared_error:invalid_n_raw");
  }

  if (m.n_raw < m.universo_final) {
    throw new Error("prepared_error:invalid_counts");
  }

  // 🔴 OPCIONES

  const ids = new Set();

  for (const o of opciones) {

    // option_id
    if (typeof o.option_id !== "string" || o.option_id.length === 0) {
      throw new Error("prepared_error:invalid_option_id");
    }

    if (ids.has(o.option_id)) {
      throw new Error("prepared_error:duplicate_option_id");
    }
    ids.add(o.option_id);

    // n
    if (
      typeof o.n !== "number" ||
      !Number.isInteger(o.n) ||
      o.n < 0
    ) {
      throw new Error("prepared_error:invalid_n");
    }

    // share
    if (
      typeof o.share !== "number" ||
      !Number.isFinite(o.share) ||
      o.share < 0 ||
      o.share > 1
    ) {
      throw new Error("prepared_error:invalid_share");
    }
  }

  // 🔴 INVARIANTES

  // suma shares
  const sumShares = opciones.reduce((a, o) => a + o.share, 0);
  if (Math.abs(sumShares - 1) > 0.00001) {
    throw new Error("prepared_error:invalid_share_sum");
  }

  // suma n
  const sumN = opciones.reduce((a, o) => a + o.n, 0);
  if (sumN !== m.universo_final) {
    throw new Error("prepared_error:invalid_n_sum");
  }

  // consistencia share vs n
  if (m.universo_final > 0) {
    for (const o of opciones) {
      const expected = o.n / m.universo_final;
      if (Math.abs(expected - o.share) > 0.00001) {
        throw new Error("prepared_error:share_mismatch");
      }
    }
  }

  // 🔴 LIMITES DE SCHEMA

  if (
    schema?.invariants?.max_options &&
    opciones.length > schema.invariants.max_options
  ) {
    throw new Error("prepared_error:too_many_options");
  }

  if (
    schema?.invariants?.minimum_options &&
    opciones.length < schema.invariants.minimum_options
  ) {
    throw new Error("prepared_error:not_enough_options");
  }
}
