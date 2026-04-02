// /api/query.js

import { loadInputs, compute } from "../lib/compute";

export default async function handler(req, res) {
  try {
    const DATA_URL = "PEGA_URL_DATA_JSON";
    const SCHEMA_URL = "PEGA_URL_SCHEMA_JSON";

    const { data, schema } = await loadInputs(DATA_URL, SCHEMA_URL);
    const result = compute(data, schema);

    // 🔴 interpretación pura (sin cálculo)

    const entries = Object.entries(result)
      .filter(([_, v]) => v.score_compuesto !== null);

    if (entries.length < 2) {
      throw new Error("No hay datos suficientes");
    }

    entries.sort((a, b) => b[1].score_compuesto - a[1].score_compuesto);

    const [wKey, w] = entries[0];
    const [sKey, s] = entries[1];

    const diffScore = w.score_compuesto - s.score_compuesto;

    const diffClaridad = w.claridad - s.claridad;
    const diffAtractivo = w.atractivo - s.atractivo;

    const driver =
      Math.abs(diffAtractivo) > Math.abs(diffClaridad)
        ? "atractivo"
        : "claridad";

    res.status(200).json({
      status: "ok",
      decision: {
        ganador: wKey,
        driver,
        diferencia_score: Number(diffScore.toFixed(4)),
        diferencia_relevante: diffScore > 0.2
      }
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
