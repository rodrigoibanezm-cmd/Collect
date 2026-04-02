// /api/compute.js

import { loadInputs, compute } from "../lib/compute";

export default async function handler(req, res) {
  try {
    const DATA_URL = "PEGA_URL_DATA_JSON";
    const SCHEMA_URL = "PEGA_URL_SCHEMA_JSON";

    const { data, schema } = await loadInputs(DATA_URL, SCHEMA_URL);
    const result = compute(data, schema);

    res.status(200).json({ status: "ok", result });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
