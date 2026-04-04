// /api/compute.js

import crypto from "crypto";
import { computeDiagnostico } from "../lib/engine/diagnostico.js";
import { applyContract } from "../lib/ingest/applyContract.js";

const MAX_DATA_ROWS = 1_000_000;
const MAX_SCHEMA_BYTES = 200_000;
const FETCH_TIMEOUT = 8000;
const MAX_RETRIES = 2;

// 🔴 DATA DESDE BLOB (FIJO)
const DATA_URL = "https://e7wkccr8ur62hidd.private.blob.vercel-storage.com/data.json";
const SCHEMA_URL = "https://e7wkccr8ur62hidd.private.blob.vercel-storage.com/Schema_operativo.json";

export default async function handler(req, res) {
  const start = Date.now();
  const trace_id = crypto.randomUUID();

  const log = (stage, info = {}) => {
    console.log(JSON.stringify({ trace_id, stage, ...info }));
  };

  if (req.method !== "POST") {
    return res.status(405).json({ error: "method_not_allowed", trace_id });
  }

  try {

    // 🔴 fetch con retry correcto
    const fetchSafe = async (url, isSchema = false) => {
      for (let i = 0; i <= MAX_RETRIES; i++) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

        try {
          const r = await fetch(url, { signal: controller.signal });

          if (r.status >= 400 && r.status < 500) {
            throw new Error(`client_error_${r.status}`);
          }

          if (!r.ok) throw new Error(`server_error_${r.status}`);

          const text = await r.text();

          if (isSchema) {
            const size = new TextEncoder().encode(text).length;
            if (size > MAX_SCHEMA_BYTES) {
              throw new Error("schema_too_large");
            }
          }

          try {
            return JSON.parse(text);
          } catch {
            throw new Error("invalid_json");
          }

        } catch (e) {
          const retryable =
            e.name === "AbortError" ||
            e.message.startsWith("server_error");

          if (!retryable || i === MAX_RETRIES) throw e;
        } finally {
          clearTimeout(timeout);
        }
      }
    };

    log("fetch_start");

    const [data, schema] = await Promise.all([
      fetchSafe(DATA_URL),
      fetchSafe(SCHEMA_URL, true)
    ]);

    log("fetch_ok", { rows: Array.isArray(data) ? data.length : null });

    // 🔴 runtime checks
    if (!Array.isArray(data)) throw new Error("invalid_data_shape");
    if (data.length > MAX_DATA_ROWS) throw new Error("dataset_too_large");

    if (!schema?.contract_id || !schema?.contract_version) {
      throw new Error("invalid_schema");
    }

    if (!schema.contract_version.startsWith("1.")) {
      throw new Error("unsupported_contract_version");
    }

    if (!schema?.invariants?.max_options) {
      throw new Error("missing_invariants");
    }

    // 🔴 evitar mutación
    const dataSafe = data.map(r => ({ ...r }));

    // 🔴 applyContract
    let prepared;
    try {
      prepared = applyContract(dataSafe, schema);
      log("contract_applied");
    } catch (e) {
      return res.status(422).json({
        error: "contract_failed",
        detail: e.message,
        trace_id,
        stage: "apply_contract"
      });
    }

    // 🔴 validar estructura base
    if (!prepared?.opciones || !Array.isArray(prepared.opciones)) {
      throw new Error("invalid_contract_output");
    }

    if (!prepared?.metadata) {
      throw new Error("missing_metadata");
    }

    const { opciones, metadata: m } = prepared;

    // 🔴 validar opciones
    const ids = new Set();

    for (const o of opciones) {
      if (typeof o.option_id !== "string" || o.option_id.length === 0) {
        throw new Error("invalid_option_id");
      }

      if (ids.has(o.option_id)) {
        throw new Error("duplicate_option_id");
      }
      ids.add(o.option_id);

      if (typeof o.n !== "number" || !Number.isInteger(o.n) || o.n < 0) {
        throw new Error("invalid_n");
      }

      if (
        typeof o.share !== "number" ||
        !Number.isFinite(o.share) ||
        o.share < 0 ||
        o.share > 1
      ) {
        throw new Error("invalid_share");
      }
    }

    // 🔴 validar shares
    const sumShares = opciones.reduce((a, o) => a + o.share, 0);
    if (Math.abs(sumShares - 1) > 0.00001) {
      throw new Error("invalid_share_sum");
    }

    // 🔴 validar suma n
    const sumN = opciones.reduce((a, o) => a + o.n, 0);
    if (sumN !== m.universo_final) {
      throw new Error("invalid_n_sum");
    }

    // 🔴 consistencia share vs n
    if (m.universo_final > 0) {
      for (const o of opciones) {
        const expected = o.n / m.universo_final;
        if (Math.abs(expected - o.share) > 0.00001) {
          throw new Error("share_mismatch");
        }
      }
    }

    // 🔴 metadata
    if (m.universo_final < 0) throw new Error("invalid_universe");
    if (m.n_raw < m.universo_final) throw new Error("invalid_counts");

    // 🔴 límites
    if (opciones.length > schema.invariants.max_options) {
      throw new Error("too_many_options");
    }

    if (
      schema.invariants.minimum_options &&
      opciones.length < schema.invariants.minimum_options
    ) {
      throw new Error("not_enough_options");
    }

    // 🔴 warnings saneados
    const warnings = {
      dataset_level: Array.isArray(prepared.warnings?.dataset_level)
        ? prepared.warnings.dataset_level
        : [],
      option_level: Array.isArray(prepared.warnings?.option_level)
        ? prepared.warnings.option_level
        : []
    };

    log("contract_validated");

    // 🔴 compute
    let result;
    try {
      result = computeDiagnostico(prepared);
      log("compute_ok");
    } catch (e) {
      return res.status(422).json({
        error: "compute_failed",
        detail: e.message,
        trace_id,
        stage: "compute"
      });
    }

    return res.status(200).json({
      trace_id,
      contract: {
        id: schema.contract_id,
        version: schema.contract_version
      },
      execution: {
        duration_ms: Date.now() - start,
        n_raw: m.n_raw,
        universo_final: m.universo_final
      },
      warnings,
      result
    });

  } catch (e) {
    log("fatal_error", { error: e.message });

    return res.status(500).json({
      error: "internal_error",
      detail: e.message,
      trace_id
    });
  }
}
